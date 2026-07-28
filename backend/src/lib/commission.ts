// Commission engine — generates and matures affiliate commissions.
//
// Public API:
//   generateCommissionForPayment(paymentId)  — call after any Payment becomes SUCCESS.
//   releaseMaturedCommissions()              — moves PENDING → AVAILABLE when holdUntil passed.
//   reverseCommissionsForPayment(paymentId)  — refund/void support.
//
// All writes are idempotent (Commission.idempotencyKey), and use a Prisma
// $transaction to keep Commission + AffiliateLedgerEntry + AffiliateCustomer
// mutations atomic.
import { prisma } from "./prisma.js";
import { WA } from "./whatsapp.js";
import type { Prisma } from "@prisma/client";

const DEFAULT_PERCENT = 5;      // fallback commission rate (%)
const DEFAULT_HOLD_DAYS = 14;   // fallback hold-period

async function getSettingNumber(key: string, fallback: number): Promise<number> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    if (!row) return fallback;
    const v = typeof row.value === "number" ? row.value : Number(row.value as never);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

/** Pick the best-matching active CommissionRule for this event. */
async function pickRule(input: {
  affiliateId: string;
  campaignId?: string | null;
  serviceType?: string | null;
  serviceRef?: string | null;
}) {
  const now = new Date();
  const rules = await prisma.commissionRule.findMany({
    where: {
      isActive: true,
      OR: [
        { scope: "AFFILIATE", affiliateId: input.affiliateId },
        input.campaignId ? { scope: "AFFILIATE_CAMPAIGN", campaignId: input.campaignId } : { id: "__none__" },
        input.serviceType ? { scope: "SERVICE_TYPE", serviceType: input.serviceType as never } : { id: "__none__" },
        input.serviceRef ? { scope: "SERVICE", serviceRef: input.serviceRef } : { id: "__none__" },
        { scope: "GLOBAL" },
      ],
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 1,
  });
  return rules[0] ?? null;
}

function computeAmount(rule: Awaited<ReturnType<typeof pickRule>>, base: number, fallbackPercent: number) {
  let amount = 0;
  let percentUsed: number | null = null;
  if (!rule) {
    percentUsed = fallbackPercent;
    amount = (base * fallbackPercent) / 100;
  } else if (rule.valueType === "FIXED" && rule.fixedAmount) {
    amount = Number(rule.fixedAmount);
  } else if (rule.valueType === "PERCENTAGE" && rule.percentage) {
    percentUsed = Number(rule.percentage);
    amount = (base * percentUsed) / 100;
  } else {
    percentUsed = fallbackPercent;
    amount = (base * fallbackPercent) / 100;
  }
  if (rule?.maxCommission) {
    amount = Math.min(amount, Number(rule.maxCommission));
  }
  return { amount: Math.max(0, Math.round(amount * 100) / 100), percentUsed };
}

/**
 * Create a PENDING commission + PENDING-bucket ledger entry for a successful payment.
 * Returns the commission (or null when no affiliate is attributed to the client).
 */
export async function generateCommissionForPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: { select: { id: true, invoiceNumber: true, projectId: true, contractId: true } },
    },
  });
  if (!payment || payment.status !== "SUCCESS") return null;

  const idempotencyKey = `payment:${payment.id}`;
  const existing = await prisma.commission.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;

  // Only paying clients earn commissions for their referring affiliate.
  const customer = await prisma.affiliateCustomer.findUnique({
    where: { clientId: payment.clientId },
    include: { affiliate: true },
  });
  if (!customer || customer.affiliate.status !== "ACTIVE") return null;

  const affiliate = customer.affiliate;
  const base = Number(payment.amount);
  if (!Number.isFinite(base) || base <= 0) return null;

  const fallbackPercent = affiliate.customRate
    ? Number(affiliate.customRate)
    : await getSettingNumber("affiliate.default_commission_percent", DEFAULT_PERCENT);
  const holdDays = affiliate.holdDays ?? await getSettingNumber("affiliate.default_hold_days", DEFAULT_HOLD_DAYS);

  const rule = await pickRule({ affiliateId: affiliate.id });
  const { amount, percentUsed } = computeAmount(rule, base, fallbackPercent);
  if (amount <= 0) return null;

  const holdUntil = new Date(Date.now() + holdDays * 86_400_000);

  try {
    const result = await prisma.$transaction(async (db) => {
      // Latest running PENDING bucket balance for this affiliate.
      const last = await db.affiliateLedgerEntry.findFirst({
        where: { affiliateId: affiliate.id, bucket: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });
      const before = Number(last?.balanceAfter ?? 0);
      const after = Math.round((before + amount) * 100) / 100;

      const commission = await db.commission.create({
        data: {
          affiliateId: affiliate.id,
          invoiceId: payment.invoiceId,
          paymentId: payment.id,
          clientId: payment.clientId,
          orderRef: payment.invoice?.invoiceNumber ?? null,
          ruleId: rule?.id ?? null,
          ruleSnapshot: rule
            ? { id: rule.id, name: rule.name, valueType: rule.valueType, percentage: rule.percentage, fixedAmount: rule.fixedAmount, maxCommission: rule.maxCommission }
            : { fallback: true, percentage: fallbackPercent },
          baseAmount: base as unknown as Prisma.Decimal,
          percentage: percentUsed as unknown as Prisma.Decimal,
          amount: amount as unknown as Prisma.Decimal,
          currency: payment.currency,
          status: "PENDING",
          holdUntil,
          idempotencyKey,
        },
      });

      await db.affiliateLedgerEntry.create({
        data: {
          affiliateId: affiliate.id,
          entryType: "COMMISSION_PENDING",
          bucket: "PENDING",
          amount: amount as unknown as Prisma.Decimal,
          currency: payment.currency,
          commissionId: commission.id,
          reference: payment.invoice?.invoiceNumber ?? payment.id,
          balanceBefore: before as unknown as Prisma.Decimal,
          balanceAfter: after as unknown as Prisma.Decimal,
          note: `عمولة معلّقة — فاتورة ${payment.invoice?.invoiceNumber ?? payment.id}`,
        },
      });

      await db.affiliateCustomer.update({
        where: { id: customer.id },
        data: {
          totalOrders: { increment: 1 },
          totalRevenue: { increment: base as unknown as Prisma.Decimal },
          totalCommission: { increment: amount as unknown as Prisma.Decimal },
          firstOrderAt: customer.firstOrderAt ?? new Date(),
        },
      });

      await db.affiliateNotification.create({
        data: {
          affiliateId: affiliate.id,
          type: "COMMISSION_PENDING",
          title: "عمولة جديدة معلّقة",
          body: `تم احتساب ${amount.toLocaleString("ar-SA")} ${payment.currency} كعمولة معلّقة (تُتاح بعد ${holdDays} يوم).`,
          meta: { commissionId: commission.id, paymentId: payment.id },
        },
      });

      return commission;
    });

    // Fire-and-forget WhatsApp alert to the affiliate.
    const userInfo = await prisma.user.findUnique({
      where: { id: affiliate.userId },
      select: { phone: true, name: true },
    });
    const phone = affiliate.phone || userInfo?.phone || null;
    WA.notify(
      phone,
      [
        `💰 *عمولة جديدة معلّقة*`,
        `━━━━━━━━━━━━━━`,
        `المبلغ: ${amount.toLocaleString("ar-SA")} ${payment.currency}`,
        `المرجع: ${payment.invoice?.invoiceNumber ?? payment.id}`,
        `تُتاح للسحب بعد: ${holdDays} يوم`,
        ``,
        `تابع من: ash-holding.sa/affiliate`,
      ].join("\n"),
      { kind: "affiliate.commission.pending", entityId: result.id },
    );

    return result;
  } catch (err) {
    console.error("[commission] generate failed", err);
    return null;
  }
}

/** Called periodically (admin/cron) — moves PENDING → AVAILABLE. */
export async function releaseMaturedCommissions(limit = 200) {
  const now = new Date();
  const matured = await prisma.commission.findMany({
    where: { status: "PENDING", holdUntil: { lte: now } },
    take: limit,
    orderBy: { holdUntil: "asc" },
  });
  let released = 0;

  for (const c of matured) {
    try {
      await prisma.$transaction(async (db) => {
        const amt = Number(c.amount);

        // Move ledger PENDING → AVAILABLE.
        const lastPending = await db.affiliateLedgerEntry.findFirst({
          where: { affiliateId: c.affiliateId, bucket: "PENDING" },
          orderBy: { createdAt: "desc" },
          select: { balanceAfter: true },
        });
        const lastAvailable = await db.affiliateLedgerEntry.findFirst({
          where: { affiliateId: c.affiliateId, bucket: "AVAILABLE" },
          orderBy: { createdAt: "desc" },
          select: { balanceAfter: true },
        });
        const pBefore = Number(lastPending?.balanceAfter ?? 0);
        const pAfter = Math.round((pBefore - amt) * 100) / 100;
        const aBefore = Number(lastAvailable?.balanceAfter ?? 0);
        const aAfter = Math.round((aBefore + amt) * 100) / 100;

        await db.affiliateLedgerEntry.createMany({
          data: [
            {
              affiliateId: c.affiliateId,
              entryType: "COMMISSION_PENDING",
              bucket: "PENDING",
              amount: -amt as unknown as Prisma.Decimal,
              currency: c.currency,
              commissionId: c.id,
              reference: c.orderRef ?? c.id,
              balanceBefore: pBefore as unknown as Prisma.Decimal,
              balanceAfter: pAfter as unknown as Prisma.Decimal,
              note: `تحرير عمولة بعد فترة الحجز`,
            },
            {
              affiliateId: c.affiliateId,
              entryType: "COMMISSION_AVAILABLE",
              bucket: "AVAILABLE",
              amount: amt as unknown as Prisma.Decimal,
              currency: c.currency,
              commissionId: c.id,
              reference: c.orderRef ?? c.id,
              balanceBefore: aBefore as unknown as Prisma.Decimal,
              balanceAfter: aAfter as unknown as Prisma.Decimal,
              note: `عمولة متاحة للسحب`,
            },
          ],
        });

        await db.commission.update({
          where: { id: c.id },
          data: { status: "AVAILABLE", availableAt: new Date() },
        });

        await db.affiliateNotification.create({
          data: {
            affiliateId: c.affiliateId,
            type: "COMMISSION_AVAILABLE",
            title: "عمولة متاحة للسحب",
            body: `أصبح مبلغ ${amt.toLocaleString("ar-SA")} ${c.currency} متاحاً للسحب.`,
            meta: { commissionId: c.id },
          },
        });
      });

      // Notify affiliate via WhatsApp.
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: c.affiliateId },
        select: { phone: true, userId: true, user: { select: { phone: true } } },
      });
      const phone = affiliate?.phone || affiliate?.user?.phone || null;
      WA.notify(
        phone,
        [
          `✅ *عمولة متاحة للسحب*`,
          `━━━━━━━━━━━━━━`,
          `المبلغ: ${Number(c.amount).toLocaleString("ar-SA")} ${c.currency}`,
          `المرجع: ${c.orderRef ?? c.id}`,
          ``,
          `اطلب السحب من: ash-holding.sa/affiliate/wallet`,
        ].join("\n"),
        { kind: "affiliate.commission.available", entityId: c.id },
      );

      released += 1;
    } catch (err) {
      console.error("[commission] release failed", c.id, err);
    }
  }

  return { scanned: matured.length, released };
}

/** Reverse commissions tied to a payment (refund/failed capture). */
export async function reverseCommissionsForPayment(paymentId: string, reason = "REFUND") {
  const commissions = await prisma.commission.findMany({
    where: { paymentId, status: { in: ["PENDING", "AVAILABLE"] } },
  });
  for (const c of commissions) {
    try {
      await prisma.$transaction(async (db) => {
        const amt = Number(c.amount);
        const bucket: "PENDING" | "AVAILABLE" = c.status === "AVAILABLE" ? "AVAILABLE" : "PENDING";
        const last = await db.affiliateLedgerEntry.findFirst({
          where: { affiliateId: c.affiliateId, bucket },
          orderBy: { createdAt: "desc" },
          select: { balanceAfter: true },
        });
        const before = Number(last?.balanceAfter ?? 0);
        const after = Math.round((before - amt) * 100) / 100;

        await db.affiliateLedgerEntry.create({
          data: {
            affiliateId: c.affiliateId,
            entryType: "COMMISSION_REVERSED",
            bucket,
            amount: -amt as unknown as Prisma.Decimal,
            currency: c.currency,
            commissionId: c.id,
            reference: c.orderRef ?? c.id,
            balanceBefore: before as unknown as Prisma.Decimal,
            balanceAfter: after as unknown as Prisma.Decimal,
            note: `عكس عمولة (${reason})`,
          },
        });
        await db.commission.update({
          where: { id: c.id },
          data: { status: "REVERSED", reversedAt: new Date(), reverseReason: reason },
        });
      });
    } catch (err) {
      console.error("[commission] reverse failed", c.id, err);
    }
  }
  return { reversed: commissions.length };
}
