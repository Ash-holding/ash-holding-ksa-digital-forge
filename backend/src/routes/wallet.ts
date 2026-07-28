import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";
import { WA } from "../lib/whatsapp.js";

export const walletRouter = Router();
walletRouter.use(requireAuth);

export const CASHBACK_RATE = 0.0185;
export const BANK_INFO = {
  beneficiary: "شركة علي صالح الشهري القابضة",
  bank: "بنك ساب (SAB)",
  iban: "SA3745000000262359391001",
  currency: "SAR",
};

function fmtMoney(n: number | string | { toString(): string }) {
  const v = typeof n === "number" ? n : Number(n?.toString() ?? 0);
  return v.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function clientPhone(clientId: string): Promise<string | null> {
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: { select: { phone: true } } },
  });
  return c?.phone || c?.user?.phone || null;
}

export async function ensureWallet(clientId: string) {
  const existing = await prisma.wallet.findUnique({ where: { clientId } });
  if (existing) return existing;
  return prisma.wallet.create({ data: { clientId } });
}

async function walletBankMsg(clientPhoneNum: string | null, subject: string, body: string) {
  const msg = [
    `🏦 *${subject}*`,
    `━━━━━━━━━━━━━━`,
    body,
    `━━━━━━━━━━━━━━`,
    `شركة ASH HOLDING — المحفظة الرقمية`,
  ].join("\n");
  WA.notify(clientPhoneNum, msg, { kind: "wallet.notify" });
}

/** Award cashback for a paid invoice — called from invoice payment flow */
export async function awardCashback(clientId: string, invoiceId: string, paidAmount: number) {
  if (!paidAmount || paidAmount <= 0) return;
  // Idempotent — do not double-award for the same invoice
  const already = await prisma.walletTransaction.findFirst({
    where: { invoiceId, type: "CASHBACK" },
    select: { id: true },
  });
  if (already) return;
  const wallet = await ensureWallet(clientId);
  const cashback = +(paidAmount * CASHBACK_RATE).toFixed(2);
  if (cashback <= 0) return;

  await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        cashbackBalance: { increment: cashback },
        balance: { increment: cashback },
      },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CASHBACK",
        status: "APPROVED",
        amount: cashback,
        balanceAfter: w.balance,
        invoiceId,
        approvedAt: new Date(),
        note: `كاش باك 1.85% على الفاتورة`,
      },
    });
  });

  const phone = await clientPhone(clientId);
  walletBankMsg(phone,
    "إشعار كاش باك 🎁",
    [
      `تم إضافة *${fmtMoney(cashback)} ر.س* كاش باك 1.85%`,
      `على فاتورتك المسددة.`,
      `الرصيد يمكن استخدامه لسداد أي فاتورة قادمة.`,
    ].join("\n"),
  );
}

// ================= CLIENT =================

walletRouter.get("/me", async (req, res, next) => {
  try {
    if (isStaff(req)) return res.json({ wallet: null, bank: BANK_INFO, cashbackRate: CASHBACK_RATE });
    const cid = await currentClientId(req);
    if (!cid) return res.status(404).json({ error: "لا يوجد حساب عميل" });
    const wallet = await ensureWallet(cid);
    const recent = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" }, take: 20,
    });
    res.json({ wallet, transactions: recent, bank: BANK_INFO, cashbackRate: CASHBACK_RATE });
  } catch (e) { next(e); }
});

walletRouter.get("/transactions", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    let walletId: string | undefined;
    if (isStaff(req)) {
      if (req.query.walletId) walletId = req.query.walletId as string;
      else if (req.query.clientId) {
        const w = await ensureWallet(req.query.clientId as string);
        walletId = w.id;
      }
    } else {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
      const w = await ensureWallet(cid);
      walletId = w.id;
    }
    const where: import("@prisma/client").Prisma.WalletTransactionWhereInput = walletId ? { walletId } : {};
    if (req.query.status) where.status = req.query.status as never;
    if (req.query.type) where.type = req.query.type as never;
    const [rows, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" }, skip, take,
        include: { wallet: { include: { client: { include: { user: { select: { name: true } } } } } } },
      }),
      prisma.walletTransaction.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});

// Client requests a top-up via bank transfer (pending admin approval)
walletRouter.post("/topup", async (req, res, next) => {
  try {
    if (isStaff(req)) return res.status(400).json({ error: "استخدم تعديل يدوي" });
    const cid = await currentClientId(req);
    if (!cid) return res.status(403).json({ error: "Forbidden" });
    const body = z.object({
      amount: z.number().positive(),
      bankRef: z.string().optional().nullable(),
      note: z.string().optional().nullable(),
      receiptUrl: z.string().optional().nullable(),
    }).parse(req.body);
    const wallet = await ensureWallet(cid);
    const tx = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "TOPUP",
        status: "PENDING",
        amount: body.amount,
        bankRef: body.bankRef || null,
        receiptUrl: body.receiptUrl || null,
        note: body.note || `طلب شحن رصيد عبر تحويل بنكي`,
      },
    });
    await logAudit(req, "wallet.topup.request", "WalletTransaction", tx.id);
    const phone = await clientPhone(cid);
    walletBankMsg(phone,
      "طلب شحن محفظة قيد المراجعة ⏳",
      [
        `المبلغ: *${fmtMoney(body.amount)} ر.س*`,
        body.bankRef ? `المرجع البنكي: ${body.bankRef}` : "",
        body.receiptUrl ? `تم إرفاق صورة الإيصال ✅` : "",
        `سيتم تأكيد الشحن فور مراجعة الحوالة.`,
      ].filter(Boolean).join("\n"),
    );
    res.status(201).json({ transaction: tx });
  } catch (e) { next(e); }
});

// Client requests withdrawal
walletRouter.post("/withdraw", async (req, res, next) => {
  try {
    if (isStaff(req)) return res.status(400).json({ error: "استخدم تعديل يدوي" });
    const cid = await currentClientId(req);
    if (!cid) return res.status(403).json({ error: "Forbidden" });
    const body = z.object({
      amount: z.number().positive(),
      iban: z.string().min(15),
      note: z.string().optional().nullable(),
    }).parse(req.body);
    const wallet = await ensureWallet(cid);
    if (Number(wallet.balance) < body.amount) {
      return res.status(400).json({ error: "الرصيد غير كافٍ" });
    }
    const tx = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAW",
        status: "PENDING",
        amount: body.amount,
        iban: body.iban,
        note: body.note || `طلب سحب رصيد`,
      },
    });
    await logAudit(req, "wallet.withdraw.request", "WalletTransaction", tx.id);
    const phone = await clientPhone(cid);
    walletBankMsg(phone,
      "طلب سحب قيد المراجعة ⏳",
      [
        `المبلغ: *${fmtMoney(body.amount)} ر.س*`,
        `IBAN: ${body.iban}`,
        `سيتم التحويل خلال يومي عمل بعد التحقق.`,
      ].join("\n"),
    );
    res.status(201).json({ transaction: tx });
  } catch (e) { next(e); }
});

// ================= ADMIN =================

// List all wallets
walletRouter.get("/admin/wallets", requireStaff, async (req, res, next) => {
  try {
    const wallets = await prisma.wallet.findMany({
      include: {
        client: { include: { user: { select: { name: true, email: true, phone: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ wallets });
  } catch (e) { next(e); }
});

// Approve / Reject transaction (topup or withdraw)
walletRouter.post("/admin/transactions/:id/approve", requireStaff, async (req, res, next) => {
  try {
    const tx = await prisma.walletTransaction.findUnique({ where: { id: req.params.id }, include: { wallet: true } });
    if (!tx) return res.status(404).json({ error: "غير موجود" });
    if (tx.status !== "PENDING") return res.status(400).json({ error: "تمت المعالجة مسبقاً" });

    const amount = Number(tx.amount);
    const sign = tx.type === "TOPUP" ? +1 : tx.type === "WITHDRAW" ? -1 : 0;
    if (sign === 0) return res.status(400).json({ error: "نوع غير قابل للاعتماد" });

    if (sign < 0 && Number(tx.wallet.balance) < amount) {
      return res.status(400).json({ error: "الرصيد لا يكفي" });
    }

    const updated = await prisma.$transaction(async (db) => {
      const w = await db.wallet.update({
        where: { id: tx.walletId },
        data: { balance: { increment: sign * amount } },
      });
      const t = await db.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: (req as any).user?.id ?? null,
          balanceAfter: w.balance,
        },
      });
      return { w, t };
    });
    await logAudit(req, `wallet.${tx.type.toLowerCase()}.approve`, "WalletTransaction", tx.id);

    const phone = await clientPhone(tx.wallet.clientId);
    const label = tx.type === "TOPUP" ? "شحن المحفظة ✅" : "تنفيذ السحب ✅";
    walletBankMsg(phone, label, [
      `${tx.type === "TOPUP" ? "إضافة" : "خصم"}: *${fmtMoney(amount)} ر.س*`,
      `الرصيد الحالي: *${fmtMoney(updated.w.balance)} ر.س*`,
    ].join("\n"));

    res.json({ transaction: updated.t, wallet: updated.w });
  } catch (e) { next(e); }
});

walletRouter.post("/admin/transactions/:id/reject", requireStaff, async (req, res, next) => {
  try {
    const body = z.object({ reason: z.string().optional() }).parse(req.body ?? {});
    const tx = await prisma.walletTransaction.findUnique({ where: { id: req.params.id }, include: { wallet: true } });
    if (!tx) return res.status(404).json({ error: "غير موجود" });
    if (tx.status !== "PENDING") return res.status(400).json({ error: "تمت المعالجة" });
    const upd = await prisma.walletTransaction.update({
      where: { id: tx.id },
      data: { status: "REJECTED", approvedById: (req as any).user?.id ?? null, approvedAt: new Date(), note: body.reason ? `${tx.note ?? ""}\nسبب الرفض: ${body.reason}` : tx.note },
    });
    await logAudit(req, `wallet.${tx.type.toLowerCase()}.reject`, "WalletTransaction", tx.id);
    const phone = await clientPhone(tx.wallet.clientId);
    walletBankMsg(phone, "طلب مرفوض ❌", [
      `${tx.type === "TOPUP" ? "طلب الشحن" : "طلب السحب"} بمبلغ *${fmtMoney(tx.amount)} ر.س* لم يُعتمد.`,
      body.reason ? `السبب: ${body.reason}` : "",
    ].filter(Boolean).join("\n"));
    res.json({ transaction: upd });
  } catch (e) { next(e); }
});

// Admin manual adjustment (add or subtract)
walletRouter.post("/admin/adjust", requireStaff, async (req, res, next) => {
  try {
    const body = z.object({
      clientId: z.string(),
      amount: z.number(),
      note: z.string().optional(),
    }).parse(req.body);
    const wallet = await ensureWallet(body.clientId);
    if (Number(wallet.balance) + body.amount < 0) return res.status(400).json({ error: "الرصيد سيصبح سالباً" });

    const result = await prisma.$transaction(async (db) => {
      const w = await db.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: body.amount } },
      });
      const t = await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "ADJUSTMENT",
          status: "APPROVED",
          amount: body.amount,
          balanceAfter: w.balance,
          approvedAt: new Date(),
          approvedById: (req as any).user?.id ?? null,
          createdById: (req as any).user?.id ?? null,
          note: body.note ?? "تعديل يدوي من الإدارة",
        },
      });
      return { w, t };
    });
    await logAudit(req, "wallet.adjust", "WalletTransaction", result.t.id);
    const phone = await clientPhone(body.clientId);
    walletBankMsg(phone,
      body.amount >= 0 ? "إضافة رصيد للمحفظة ✅" : "خصم من المحفظة",
      [
        `${body.amount >= 0 ? "أضيف" : "خصم"}: *${fmtMoney(Math.abs(body.amount))} ر.س*`,
        `الرصيد الحالي: *${fmtMoney(result.w.balance)} ر.س*`,
        body.note ? `الملاحظة: ${body.note}` : "",
      ].filter(Boolean).join("\n"),
    );
    res.json({ wallet: result.w, transaction: result.t });
  } catch (e) { next(e); }
});
