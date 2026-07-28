// Affiliate admin API (SUPER_ADMIN | ADMIN | AFFILIATE_MANAGER).
// Mounted at /api/admin/affiliate.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { WA } from "../lib/whatsapp.js";
import {
  releaseMaturedCommissions,
  reverseCommissionsForPayment,
} from "../lib/commission.js";
import { runFraudScan } from "../lib/fraud.js";
import { logAudit } from "../lib/audit.js";
import { randomBytes } from "crypto";

export const affiliateAdminRouter = Router();

// ---------- gate: staff or affiliate-manager ----------
const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "AFFILIATE_MANAGER"] as const;
affiliateAdminRouter.use(requireAuth, (req, res, next) => {
  const user = (req as any).user;
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
});

// ============================================================
// 1) OVERVIEW / REPORTS
// ============================================================
affiliateAdminRouter.get("/overview", async (_req, res, next) => {
  try {
    const [
      affiliatesTotal,
      affiliatesActive,
      affiliatesPending,
      applicationsPending,
      commissionsAgg,
      commissionsByStatus,
      withdrawalsPending,
      withdrawalsPaidAgg,
      clicks30d,
      customers30d,
    ] = await Promise.all([
      prisma.affiliate.count(),
      prisma.affiliate.count({ where: { status: "ACTIVE" } }),
      prisma.affiliate.count({ where: { status: "PENDING" } }),
      prisma.affiliateApplication.count({ where: { status: { in: ["NEW", "UNDER_REVIEW"] } } }),
      prisma.commission.aggregate({ _sum: { amount: true }, _count: { _all: true } }),
      prisma.commission.groupBy({ by: ["status"], _sum: { amount: true }, _count: { _all: true } }),
      prisma.withdrawalRequest.count({ where: { status: { in: ["NEW", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } } }),
      prisma.withdrawalRequest.aggregate({ where: { status: "PAID" }, _sum: { netAmount: true } }),
      prisma.affiliateClick.count({ where: { createdAt: { gte: daysAgo(30) } } }),
      prisma.affiliateCustomer.count({ where: { firstOrderAt: { gte: daysAgo(30) } } }),
    ]);

    res.json({
      affiliates: { total: affiliatesTotal, active: affiliatesActive, pending: affiliatesPending },
      applications: { pending: applicationsPending },
      commissions: {
        total: Number(commissionsAgg._sum.amount || 0),
        count: commissionsAgg._count._all,
        byStatus: commissionsByStatus.map((r) => ({
          status: r.status, amount: Number(r._sum.amount || 0), count: r._count._all,
        })),
      },
      withdrawals: {
        pending: withdrawalsPending,
        paidTotal: Number(withdrawalsPaidAgg._sum.netAmount || 0),
      },
      last30d: { clicks: clicks30d, newCustomers: customers30d },
    });
  } catch (e) { next(e); }
});

affiliateAdminRouter.get("/reports/top-affiliates", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const rows = await prisma.commission.groupBy({
      by: ["affiliateId"],
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      take: limit,
    });
    const affiliates = await prisma.affiliate.findMany({
      where: { id: { in: rows.map((r) => r.affiliateId) } },
      select: { id: true, code: true, displayName: true, status: true },
    });
    const map = new Map(affiliates.map((a) => [a.id, a]));
    res.json({
      rows: rows.map((r) => ({
        ...map.get(r.affiliateId),
        totalCommission: Number(r._sum.amount || 0),
        commissionsCount: r._count._all,
      })),
    });
  } catch (e) { next(e); }
});

// ============================================================
// 2) AFFILIATES
// ============================================================
affiliateAdminRouter.get("/affiliates", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const take = Math.min(Number(req.query.take) || 50, 200);
    const skip = Number(req.query.skip) || 0;

    const where: Prisma.AffiliateWhereInput = {};
    if (status && ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "CLOSED"].includes(status)) {
      where.status = status as Prisma.AffiliateWhereInput["status"];
    }
    if (q) {
      where.OR = [
        { displayName: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.affiliate.findMany({
        where, take, skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, code: true, displayName: true, phone: true, email: true,
          status: true, type: true, city: true, country: true,
          customRate: true, holdDays: true, cookieDays: true,
          approvedAt: true, createdAt: true,
          _count: { select: { links: true, referredCustomers: true, commissions: true, withdrawals: true } },
        },
      }),
      prisma.affiliate.count({ where }),
    ]);
    res.json({ items, total });
  } catch (e) { next(e); }
});

affiliateAdminRouter.get("/affiliates/:id", async (req, res, next) => {
  try {
    const a = await prisma.affiliate.findUnique({
      where: { id: req.params.id },
      include: {
        application: true,
        user: { select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } },
        _count: { select: { links: true, campaigns: true, referredCustomers: true, commissions: true, withdrawals: true } },
      },
    });
    if (!a) return res.status(404).json({ error: "Not found" });

    const [balancesRaw, recentCommissions, recentWithdrawals, recentClicks] = await Promise.all([
      prisma.affiliateLedgerEntry.groupBy({
        by: ["bucket"],
        where: { affiliateId: a.id },
        _sum: { amount: true },
      }),
      prisma.commission.findMany({
        where: { affiliateId: a.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.withdrawalRequest.findMany({
        where: { affiliateId: a.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.affiliateClick.count({ where: { affiliateId: a.id, createdAt: { gte: daysAgo(30) } } }),
    ]);

    const balances: Record<string, number> = { PENDING: 0, AVAILABLE: 0, RESERVED: 0, PAID: 0 };
    for (const b of balancesRaw) balances[b.bucket] = Number(b._sum.amount || 0);

    res.json({ affiliate: a, balances, recentCommissions, recentWithdrawals, clicks30d: recentClicks });
  } catch (e) { next(e); }
});

const patchAffiliateSchema = z.object({
  displayName: z.string().min(3).max(120).optional(),
  legalName: z.string().max(120).optional().nullable(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional(),
  city: z.string().max(80).optional().nullable(),
  country: z.string().max(4).optional(),
  customRate: z.number().min(0).max(100).optional().nullable(),
  cookieDays: z.number().int().min(0).max(365).optional().nullable(),
  holdDays: z.number().int().min(0).max(180).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  website: z.string().url().optional().nullable(),
});
affiliateAdminRouter.patch("/affiliates/:id", async (req, res, next) => {
  try {
    const body = patchAffiliateSchema.parse(req.body);
    const updated = await prisma.affiliate.update({
      where: { id: req.params.id },
      data: body as Prisma.AffiliateUpdateInput,
    });
    res.json({ affiliate: updated });
  } catch (e) { next(e); }
});

affiliateAdminRouter.post("/affiliates/:id/approve", async (req, res, next) => {
  try {
    const user = (req as any).user;
    const a = await prisma.affiliate.update({
      where: { id: req.params.id },
      data: { status: "ACTIVE", approvedAt: new Date(), approvedById: user.id, suspendedAt: null, suspendReason: null },
    });
    await prisma.affiliateApplication.updateMany({
      where: { affiliateId: a.id }, data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: user.id },
    });
    WA.notify(a.phone, `ASH HOLDING — تم اعتماد حسابك كمسوّق ✅\nكود الإحالة: ${a.code}\nمرحباً بك في برنامج الشراكة.`,
      { kind: "affiliate.approved", entityId: a.id });
    await prisma.affiliateNotification.create({
      data: { affiliateId: a.id, title: "تم اعتماد حسابك", body: "أصبح حسابك مفعّلاً — يمكنك البدء بمشاركة روابطك.", category: "success" },
    });
    await logAudit(req, "affiliate.approve", "Affiliate", a.id, { code: a.code });
    res.json({ affiliate: a });
  } catch (e) { next(e); }
});

affiliateAdminRouter.post("/affiliates/:id/suspend", async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "").slice(0, 500) || null;
    const a = await prisma.affiliate.update({
      where: { id: req.params.id },
      data: { status: "SUSPENDED", suspendedAt: new Date(), suspendReason: reason },
    });
    WA.notify(a.phone, `ASH HOLDING — تم إيقاف حسابك مؤقتاً${reason ? `\nالسبب: ${reason}` : ""}`,
      { kind: "affiliate.suspended", entityId: a.id });
    await logAudit(req, "affiliate.suspend", "Affiliate", a.id, { reason });
    res.json({ affiliate: a });
  } catch (e) { next(e); }
});

affiliateAdminRouter.post("/affiliates/:id/reject", async (req, res, next) => {
  try {
    const user = (req as any).user;
    const reason = String(req.body?.reason || "").slice(0, 500) || null;
    const a = await prisma.affiliate.update({
      where: { id: req.params.id }, data: { status: "REJECTED", suspendReason: reason },
    });
    await prisma.affiliateApplication.updateMany({
      where: { affiliateId: a.id }, data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: user.id, reviewNote: reason },
    });
    WA.notify(a.phone, `ASH HOLDING — نعتذر، لم يتم اعتماد طلبك${reason ? `\nالسبب: ${reason}` : ""}`,
      { kind: "affiliate.rejected", entityId: a.id });
    await logAudit(req, "affiliate.reject", "Affiliate", a.id, { reason });
    res.json({ affiliate: a });
  } catch (e) { next(e); }
});

// ============================================================
// 3) APPLICATIONS
// ============================================================
affiliateAdminRouter.get("/applications", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "NEW";
    const items = await prisma.affiliateApplication.findMany({
      where: status === "ALL" ? {} : { status: status as Prisma.AffiliateApplicationWhereInput["status"] },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { affiliate: { select: { id: true, code: true, status: true } } },
    });
    res.json({ items });
  } catch (e) { next(e); }
});

// ============================================================
// 4) COMMISSION RULES
// ============================================================
const ruleSchema = z.object({
  name: z.string().min(2).max(120),
  scope: z.enum(["GLOBAL", "SERVICE_TYPE", "SERVICE", "AFFILIATE", "AFFILIATE_CAMPAIGN"]),
  valueType: z.enum(["PERCENTAGE", "FIXED", "TIERED"]).default("PERCENTAGE"),
  percentage: z.number().min(0).max(100).optional().nullable(),
  fixedAmount: z.number().min(0).optional().nullable(),
  serviceType: z.string().optional().nullable(),
  serviceRef: z.string().optional().nullable(),
  affiliateId: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  priority: z.number().int().min(0).max(1000).default(0),
  maxCommission: z.number().min(0).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().max(1000).optional().nullable(),
});

affiliateAdminRouter.get("/rules", async (_req, res, next) => {
  try {
    const rules = await prisma.commissionRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        affiliate: { select: { id: true, code: true, displayName: true } },
        campaign: { select: { id: true, name: true } },
      },
    });
    res.json({ items: rules });
  } catch (e) { next(e); }
});

affiliateAdminRouter.post("/rules", async (req, res, next) => {
  try {
    const body = ruleSchema.parse(req.body);
    const rule = await prisma.commissionRule.create({ data: body as Prisma.CommissionRuleCreateInput });
    await logAudit(req, "commission_rule.create", "CommissionRule", rule.id, { scope: rule.scope, valueType: rule.valueType });
    res.status(201).json({ rule });
  } catch (e) { next(e); }
});

affiliateAdminRouter.patch("/rules/:id", async (req, res, next) => {
  try {
    const body = ruleSchema.partial().parse(req.body);
    const rule = await prisma.commissionRule.update({
      where: { id: req.params.id }, data: body as Prisma.CommissionRuleUpdateInput,
    });
    await logAudit(req, "commission_rule.update", "CommissionRule", rule.id, body as Record<string, unknown>);
    res.json({ rule });
  } catch (e) { next(e); }
});

affiliateAdminRouter.delete("/rules/:id", async (req, res, next) => {
  try {
    await prisma.commissionRule.delete({ where: { id: req.params.id } });
    await logAudit(req, "commission_rule.delete", "CommissionRule", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ============================================================
// 5) COMMISSIONS
// ============================================================
affiliateAdminRouter.get("/commissions", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const affiliateId = typeof req.query.affiliateId === "string" ? req.query.affiliateId : undefined;
    const take = Math.min(Number(req.query.take) || 50, 200);
    const skip = Number(req.query.skip) || 0;
    const where: Prisma.CommissionWhereInput = {};
    if (status) where.status = status as Prisma.CommissionWhereInput["status"];
    if (affiliateId) where.affiliateId = affiliateId;

    const [items, total] = await Promise.all([
      prisma.commission.findMany({
        where, take, skip,
        orderBy: { createdAt: "desc" },
        include: { affiliate: { select: { id: true, code: true, displayName: true } } },
      }),
      prisma.commission.count({ where }),
    ]);
    res.json({ items, total });
  } catch (e) { next(e); }
});

affiliateAdminRouter.post("/commissions/:id/reverse", async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "تم العكس يدوياً").slice(0, 500);
    const c = await prisma.commission.findUnique({ where: { id: req.params.id } });
    if (!c) return res.status(404).json({ error: "Not found" });
    if (!c.paymentId) return res.status(400).json({ error: "لا يوجد دفعة مرتبطة" });
    const r = await reverseCommissionsForPayment(c.paymentId, reason);
    res.json({ ok: true, ...r });
  } catch (e) { next(e); }
});

// ============================================================
// 6) WITHDRAWALS
// ============================================================
affiliateAdminRouter.get("/withdrawals", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const take = Math.min(Number(req.query.take) || 50, 200);
    const skip = Number(req.query.skip) || 0;
    const where: Prisma.WithdrawalRequestWhereInput = {};
    if (status && status !== "ALL") where.status = status as Prisma.WithdrawalRequestWhereInput["status"];

    const [items, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where, take, skip,
        orderBy: { createdAt: "desc" },
        include: {
          affiliate: { select: { id: true, code: true, displayName: true, phone: true } },
          account: { select: { id: true, beneficiaryName: true, bankName: true, ibanMasked: true } },
        },
      }),
      prisma.withdrawalRequest.count({ where }),
    ]);
    res.json({ items, total });
  } catch (e) { next(e); }
});

const patchWithdrawalSchema = z.object({
  status: z.enum(["NEW", "UNDER_REVIEW", "APPROVED", "PROCESSING", "PAID", "REJECTED", "CANCELLED"]),
  adminNote: z.string().max(1000).optional().nullable(),
  transferRef: z.string().max(120).optional().nullable(),
  rejectionReason: z.string().max(500).optional().nullable(),
});
affiliateAdminRouter.patch("/withdrawals/:id", async (req, res, next) => {
  try {
    const user = (req as any).user;
    const body = patchWithdrawalSchema.parse(req.body);

    const current = await prisma.withdrawalRequest.findUnique({
      where: { id: req.params.id },
      include: { affiliate: { select: { id: true, phone: true, displayName: true } } },
    });
    if (!current) return res.status(404).json({ error: "Not found" });

    const now = new Date();
    const data: Prisma.WithdrawalRequestUpdateInput = {
      status: body.status,
      adminNote: body.adminNote ?? current.adminNote,
      transferRef: body.transferRef ?? current.transferRef,
      rejectionReason: body.rejectionReason ?? current.rejectionReason,
      reviewedAt: now,
      reviewedById: user.id,
    };
    if (body.status === "PAID" && !current.paidAt) data.paidAt = now;

    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawalRequest.update({ where: { id: current.id }, data });

      // On PAID: shift RESERVED balance to PAID bucket + notify.
      if (body.status === "PAID" && current.status !== "PAID") {
        const [last1, last2] = await Promise.all([
          tx.affiliateLedgerEntry.findFirst({ where: { affiliateId: current.affiliateId, bucket: "RESERVED" }, orderBy: { createdAt: "desc" } }),
          tx.affiliateLedgerEntry.findFirst({ where: { affiliateId: current.affiliateId, bucket: "PAID" }, orderBy: { createdAt: "desc" } }),
        ]);
        const rBefore = Number(last1?.balanceAfter || 0);
        const pBefore = Number(last2?.balanceAfter || 0);
        const amt = Number(current.netAmount);
        await tx.affiliateLedgerEntry.createMany({
          data: [
            {
              affiliateId: current.affiliateId, entryType: "WITHDRAWAL_PAID", bucket: "RESERVED",
              amount: -amt, currency: current.currency, withdrawalId: current.id,
              balanceBefore: rBefore, balanceAfter: rBefore - amt, createdById: user.id,
              note: "تحويل بنكي — سحب معتمد",
            },
            {
              affiliateId: current.affiliateId, entryType: "WITHDRAWAL_PAID", bucket: "PAID",
              amount: amt, currency: current.currency, withdrawalId: current.id,
              balanceBefore: pBefore, balanceAfter: pBefore + amt, createdById: user.id,
              note: "تحويل بنكي — سحب مدفوع",
            },
          ],
        });
        await tx.commission.updateMany({
          where: { affiliateId: current.affiliateId, status: "WITHDRAWAL_REQUESTED" },
          data: { status: "PAID", paidAt: now },
        });
      }

      // On REJECTED / CANCELLED (from a reserving state): release RESERVED back to AVAILABLE.
      if ((body.status === "REJECTED" || body.status === "CANCELLED") &&
          ["NEW", "UNDER_REVIEW", "APPROVED", "PROCESSING"].includes(current.status)) {
        const [lastR, lastA] = await Promise.all([
          tx.affiliateLedgerEntry.findFirst({ where: { affiliateId: current.affiliateId, bucket: "RESERVED" }, orderBy: { createdAt: "desc" } }),
          tx.affiliateLedgerEntry.findFirst({ where: { affiliateId: current.affiliateId, bucket: "AVAILABLE" }, orderBy: { createdAt: "desc" } }),
        ]);
        const rBefore = Number(lastR?.balanceAfter || 0);
        const aBefore = Number(lastA?.balanceAfter || 0);
        const amt = Number(current.amount);
        await tx.affiliateLedgerEntry.createMany({
          data: [
            {
              affiliateId: current.affiliateId, entryType: "WITHDRAWAL_RELEASED", bucket: "RESERVED",
              amount: -amt, currency: current.currency, withdrawalId: current.id,
              balanceBefore: rBefore, balanceAfter: rBefore - amt, createdById: user.id,
              note: "إلغاء حجز — رفض/إلغاء طلب سحب",
            },
            {
              affiliateId: current.affiliateId, entryType: "WITHDRAWAL_RELEASED", bucket: "AVAILABLE",
              amount: amt, currency: current.currency, withdrawalId: current.id,
              balanceBefore: aBefore, balanceAfter: aBefore + amt, createdById: user.id,
              note: "إعادة الرصيد للمتاح",
            },
          ],
        });
        await tx.commission.updateMany({
          where: { affiliateId: current.affiliateId, status: "WITHDRAWAL_REQUESTED" },
          data: { status: "AVAILABLE" },
        });
      }

      return w;
    });

    // WhatsApp notifications
    const phone = current.affiliate.phone;
    if (body.status === "APPROVED") {
      WA.notify(phone, `ASH HOLDING — تم اعتماد طلب السحب #${current.requestNumber} ✅\nالمبلغ: ${current.netAmount} ${current.currency}\nسيتم التحويل قريباً.`,
        { kind: "withdrawal.approved", entityId: current.id });
    } else if (body.status === "PAID") {
      WA.notify(phone, `ASH HOLDING — تم تنفيذ التحويل ✅\nطلب السحب #${current.requestNumber}\nالمبلغ: ${current.netAmount} ${current.currency}${body.transferRef ? `\nمرجع التحويل: ${body.transferRef}` : ""}`,
        { kind: "withdrawal.paid", entityId: current.id });
    } else if (body.status === "REJECTED") {
      WA.notify(phone, `ASH HOLDING — تم رفض طلب السحب #${current.requestNumber}${body.rejectionReason ? `\nالسبب: ${body.rejectionReason}` : ""}\nتمت إعادة الرصيد إلى المتاح.`,
        { kind: "withdrawal.rejected", entityId: current.id });
    }
    await prisma.affiliateNotification.create({
      data: {
        affiliateId: current.affiliateId,
        title: `تحديث طلب السحب #${current.requestNumber}`,
        body: `الحالة الجديدة: ${body.status}`,
        category: body.status === "PAID" ? "success" : body.status === "REJECTED" ? "warning" : "info",
      },
    });

    await logAudit(req, `withdrawal.${body.status.toLowerCase()}`, "WithdrawalRequest", updated.id, {
      requestNumber: current.requestNumber,
      amount: Number(current.amount),
      previousStatus: current.status,
      newStatus: body.status,
      transferRef: body.transferRef ?? null,
      rejectionReason: body.rejectionReason ?? null,
    });
    res.json({ withdrawal: updated });
  } catch (e) { next(e); }
});

// ============================================================
// 7) MARKETING MATERIALS
// ============================================================
const materialSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(["TEXT", "WHATSAPP", "SOCIAL", "EMAIL", "LANDING_LINK", "PROFILE", "OFFER", "LOGO", "GUIDE"]),
  category: z.string().max(80).optional().nullable(),
  content: z.string().min(1),
  filePath: z.string().max(500).optional().nullable(),
  tags: z.array(z.string()).max(20).default([]),
  isActive: z.boolean().default(true),
});
affiliateAdminRouter.get("/marketing", async (_req, res, next) => {
  try {
    const items = await prisma.marketingMaterial.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ items });
  } catch (e) { next(e); }
});
affiliateAdminRouter.post("/marketing", async (req, res, next) => {
  try {
    const user = (req as any).user;
    const body = materialSchema.parse(req.body);
    const m = await prisma.marketingMaterial.create({
      data: { ...body, createdById: user.id },
    });
    res.status(201).json({ material: m });
  } catch (e) { next(e); }
});
affiliateAdminRouter.patch("/marketing/:id", async (req, res, next) => {
  try {
    const body = materialSchema.partial().parse(req.body);
    const m = await prisma.marketingMaterial.update({ where: { id: req.params.id }, data: body });
    res.json({ material: m });
  } catch (e) { next(e); }
});
affiliateAdminRouter.delete("/marketing/:id", async (req, res, next) => {
  try {
    await prisma.marketingMaterial.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ============================================================
// 8) RELEASE (matured commissions — manual trigger from admin UI)
// ============================================================
affiliateAdminRouter.post("/release", async (req, res, next) => {
  try {
    const result = await releaseMaturedCommissions(500);
    await logAudit(req, "affiliate.release", "Commission", null as unknown as string, result as unknown as Record<string, unknown>);
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});

// ============================================================
// 9) FRAUD & ANOMALY DETECTION (read-only signals)
// GET /api/admin/affiliate/fraud?days=30
// ============================================================
affiliateAdminRouter.get("/fraud", async (req, res, next) => {
  try {
    const windowDays = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const alerts = await runFraudScan({ windowDays });
    const affiliateIds = Array.from(new Set(alerts.flatMap((a) => a.affiliateIds)));
    const affiliates = affiliateIds.length
      ? await prisma.affiliate.findMany({
          where: { id: { in: affiliateIds } },
          select: { id: true, code: true, displayName: true, phone: true, status: true },
        })
      : [];
    const byId = new Map(affiliates.map((a) => [a.id, a] as const));
    res.json({
      windowDays,
      summary: {
        high: alerts.filter((a) => a.severity === "HIGH").length,
        medium: alerts.filter((a) => a.severity === "MEDIUM").length,
        low: alerts.filter((a) => a.severity === "LOW").length,
        total: alerts.length,
      },
      alerts: alerts.map((a) => ({ ...a, affiliates: a.affiliateIds.map((id) => byId.get(id) || { id }) })),
    });
  } catch (e) { next(e); }
});

// ---------- utils ----------
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
// keep randomBytes referenced for future admin token endpoints
void randomBytes;
