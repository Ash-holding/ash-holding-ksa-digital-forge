// Affiliate portal API.
// Public:
//   POST /api/affiliate/apply           — submit application (no auth)
// Authenticated (affiliate owner):
//   GET  /api/affiliate/me              — profile + status
//   GET  /api/affiliate/dashboard       — stats & balances
//   GET  /api/affiliate/links           — list
//   POST /api/affiliate/links           — create short link
//   PATCH /api/affiliate/links/:id      — update
//   DELETE /api/affiliate/links/:id     — delete
//   GET  /api/affiliate/campaigns
//   POST /api/affiliate/campaigns
//   GET  /api/affiliate/marketing       — marketing center (all active materials)
//   GET  /api/affiliate/commissions
//   GET  /api/affiliate/customers
//   GET  /api/affiliate/notifications
//   POST /api/affiliate/notifications/read-all
import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { affiliateApplyLimiter } from "../middleware/rate-limit.js";
import { safeEqualSecret } from "../lib/cron-auth.js";
import { WA } from "../lib/whatsapp.js";
import { releaseMaturedCommissions } from "../lib/commission.js";

export const affiliateRouter = Router();

// ---------- helpers ----------
function makeCode(prefix = "AF"): string {
  // AF-XXXXXX (6 chars, base32-ish upper)
  const raw = randomBytes(4).toString("base64url").replace(/[-_]/g, "").slice(0, 6).toUpperCase();
  return `${prefix}-${raw}`;
}
function makeSlug(len = 7): string {
  return randomBytes(6).toString("base64url").replace(/[-_]/g, "").slice(0, len).toLowerCase();
}
async function currentAffiliate(userId: string) {
  return prisma.affiliate.findUnique({
    where: { userId },
    select: {
      id: true, code: true, status: true, type: true, displayName: true,
      email: true, phone: true, city: true, country: true, bio: true,
      website: true, socialLinks: true, cookieDays: true, holdDays: true,
      customRate: true, preferredPayout: true, approvedAt: true, createdAt: true,
    },
  });
}
type RequireAffiliateResult =
  | { error: string; status: 403 | 404; data?: NonNullable<Awaited<ReturnType<typeof currentAffiliate>>> }
  | { data: NonNullable<Awaited<ReturnType<typeof currentAffiliate>>> };

async function requireAffiliate(userId: string): Promise<RequireAffiliateResult> {
  const a = await currentAffiliate(userId);
  if (!a) return { error: "لا يوجد حساب مسوّق مرتبط", status: 404 };
  if (a.status !== "ACTIVE") return { error: "حسابك غير مفعّل بعد", status: 403, data: a };
  return { data: a };
}
function sumDecimal<T extends { amount: unknown }>(rows: T[]): number {
  return rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
}

// ---------- PUBLIC: application ----------
const applySchema = z.object({
  fullName: z.string().min(3).max(120),
  phone: z.string().min(8).max(20),
  email: z.string().email(),
  city: z.string().max(80).optional(),
  country: z.string().max(4).default("SA"),
  type: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
  idNumber: z.string().max(30).optional(),
  commercialNo: z.string().max(30).optional(),
  preferredPayout: z.enum(["BANK_SA", "IBAN", "DIGITAL_WALLET", "ACCOUNT_CREDIT", "MANUAL"]).optional(),
  notes: z.string().max(1000).optional(),
  agreementAccepted: z.literal(true),
  agreementVersion: z.string().max(20).default("v1"),
});

affiliateRouter.post("/apply", affiliateApplyLimiter, async (req, res, next) => {
  try {
    const body = applySchema.parse(req.body);

    // Try to associate with existing user (by email)
    const existingUser = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });

    // Prevent duplicate open applications by phone/email
    const dup = await prisma.affiliateApplication.findFirst({
      where: {
        status: { in: ["NEW", "UNDER_REVIEW"] },
        OR: [{ email: body.email }, { phone: body.phone }],
      },
      select: { id: true, status: true },
    });
    if (dup) return res.status(409).json({ error: "لديك طلب انضمام قيد المراجعة بالفعل" });

    const app = await prisma.affiliateApplication.create({
      data: {
        userId: existingUser?.id ?? null,
        fullName: body.fullName,
        phone: body.phone,
        email: body.email,
        city: body.city,
        country: body.country,
        type: body.type,
        idNumber: body.idNumber,
        commercialNo: body.commercialNo,
        preferredPayout: body.preferredPayout,
        notes: body.notes,
        agreementAccepted: body.agreementAccepted,
        agreementVersion: body.agreementVersion,
      },
      select: { id: true, status: true, createdAt: true },
    });

    // Non-blocking WhatsApp acknowledgement
    WA.send(
      body.phone,
      `مرحباً ${body.fullName} 👋\nتم استلام طلب انضمامك لبرنامج شركاء ASH HOLDING.\nسنراجع الطلب ونعود إليك خلال 24-48 ساعة.\nرقم الطلب: ${app.id.slice(-6).toUpperCase()}`
    ).catch(() => {});

    res.status(201).json({ ok: true, application: app });
  } catch (e) { next(e); }
});

// Anyone can check their own application by email+phone
affiliateRouter.post("/apply/status", async (req, res, next) => {
  try {
    const { email, phone } = z.object({ email: z.string().email(), phone: z.string().min(8) }).parse(req.body);
    const app = await prisma.affiliateApplication.findFirst({
      where: { email, phone },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, reviewNote: true, createdAt: true, reviewedAt: true },
    });
    if (!app) return res.status(404).json({ error: "لا يوجد طلب مرتبط بهذه البيانات" });
    res.json({ application: app });
  } catch (e) { next(e); }
});

// ---------- AUTH: profile ----------
affiliateRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const a = await currentAffiliate(req.user!.sub);
    if (!a) {
      // Also return latest application if any
      const app = await prisma.affiliateApplication.findFirst({
        where: { userId: req.user!.sub },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, reviewNote: true, createdAt: true },
      });
      return res.json({ affiliate: null, application: app });
    }
    res.json({ affiliate: a });
  } catch (e) { next(e); }
});

// ---------- AUTH: dashboard ----------
affiliateRouter.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error, affiliate: g.data ?? null });
    const affiliateId = g.data.id;

    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 86400_000);

    const [
      totalClicks, uniqueClicks, clicksLast30,
      totalCustomers, activeLinks, activeCampaigns,
      commissionsAgg, ledgerRows, recentCommissions, notificationsUnread,
    ] = await Promise.all([
      prisma.affiliateClick.count({ where: { affiliateId, isBot: false } }),
      prisma.affiliateClick.count({ where: { affiliateId, isBot: false, isUnique: true } }),
      prisma.affiliateClick.count({ where: { affiliateId, isBot: false, createdAt: { gte: last30 } } }),
      prisma.affiliateCustomer.count({ where: { affiliateId } }),
      prisma.affiliateLink.count({ where: { affiliateId, isActive: true } }),
      prisma.affiliateCampaign.count({ where: { affiliateId, isActive: true } }),
      prisma.commission.groupBy({
        by: ["status"],
        where: { affiliateId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.affiliateLedgerEntry.groupBy({
        by: ["bucket"],
        where: { affiliateId },
        _sum: { amount: true },
      }),
      prisma.commission.findMany({
        where: { affiliateId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, amount: true, status: true, orderRef: true, createdAt: true, holdUntil: true, availableAt: true },
      }),
      prisma.affiliateNotification.count({ where: { affiliateId, isRead: false } }),
    ]);

    const bucketMap: Record<string, number> = { PENDING: 0, AVAILABLE: 0, RESERVED: 0, PAID: 0 };
    for (const r of ledgerRows) bucketMap[r.bucket] = Number(r._sum.amount || 0);

    const commissionMap: Record<string, { amount: number; count: number }> = {};
    for (const r of commissionsAgg) commissionMap[r.status] = { amount: Number(r._sum.amount || 0), count: r._count._all };

    res.json({
      affiliate: g.data,
      metrics: {
        clicks: { total: totalClicks, unique: uniqueClicks, last30: clicksLast30 },
        customers: totalCustomers,
        links: activeLinks,
        campaigns: activeCampaigns,
        notificationsUnread,
      },
      balances: {
        pending: bucketMap.PENDING,
        available: bucketMap.AVAILABLE,
        reserved: bucketMap.RESERVED,
        paid: bucketMap.PAID,
        withdrawable: Math.max(0, bucketMap.AVAILABLE - bucketMap.RESERVED),
      },
      commissions: commissionMap,
      recent: recentCommissions,
    });
  } catch (e) { next(e); }
});

// ---------- AUTH: links ----------
const createLinkSchema = z.object({
  landingPath: z.string().max(300).default("/"),
  label: z.string().max(120).optional(),
  campaignId: z.string().cuid().optional().nullable(),
  serviceRef: z.string().max(80).optional().nullable(),
});
affiliateRouter.get("/links", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const items = await prisma.affiliateLink.findMany({
      where: { affiliateId: g.data.id },
      orderBy: { createdAt: "desc" },
      include: { campaign: { select: { id: true, name: true } } },
    });
    res.json({ items, code: g.data.code });
  } catch (e) { next(e); }
});
affiliateRouter.post("/links", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const body = createLinkSchema.parse(req.body);
    // ensure unique slug (retry a few times)
    let slug = makeSlug();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.affiliateLink.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) break;
      slug = makeSlug();
    }
    const link = await prisma.affiliateLink.create({
      data: {
        affiliateId: g.data.id,
        slug,
        landingPath: body.landingPath || "/",
        label: body.label ?? null,
        campaignId: body.campaignId ?? null,
        serviceRef: body.serviceRef ?? null,
      },
    });
    res.status(201).json({ link });
  } catch (e) { next(e); }
});
affiliateRouter.patch("/links/:id", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const body = z.object({
      landingPath: z.string().max(300).optional(),
      label: z.string().max(120).nullable().optional(),
      isActive: z.boolean().optional(),
      campaignId: z.string().cuid().nullable().optional(),
    }).parse(req.body);
    const existing = await prisma.affiliateLink.findUnique({ where: { id: req.params.id }, select: { affiliateId: true } });
    if (!existing || existing.affiliateId !== g.data.id) return res.status(404).json({ error: "الرابط غير موجود" });
    const link = await prisma.affiliateLink.update({ where: { id: req.params.id }, data: body });
    res.json({ link });
  } catch (e) { next(e); }
});
affiliateRouter.delete("/links/:id", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const existing = await prisma.affiliateLink.findUnique({ where: { id: req.params.id }, select: { affiliateId: true } });
    if (!existing || existing.affiliateId !== g.data.id) return res.status(404).json({ error: "الرابط غير موجود" });
    await prisma.affiliateLink.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- AUTH: campaigns ----------
const campaignSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "أحرف صغيرة وأرقام و - فقط"),
  description: z.string().max(500).optional(),
  landingPath: z.string().max(300).default("/"),
  utmSource: z.string().max(80).optional(),
  utmMedium: z.string().max(80).optional(),
  utmCampaign: z.string().max(80).optional(),
});
affiliateRouter.get("/campaigns", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const items = await prisma.affiliateCampaign.findMany({
      where: { affiliateId: g.data.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { links: true, clicks: true } } },
    });
    res.json({ items });
  } catch (e) { next(e); }
});
affiliateRouter.post("/campaigns", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const body = campaignSchema.parse(req.body);
    const campaign = await prisma.affiliateCampaign.create({
      data: { ...body, affiliateId: g.data.id },
    });
    res.status(201).json({ campaign });
  } catch (e) { next(e); }
});
affiliateRouter.patch("/campaigns/:id", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const body = campaignSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    const existing = await prisma.affiliateCampaign.findUnique({ where: { id: req.params.id }, select: { affiliateId: true } });
    if (!existing || existing.affiliateId !== g.data.id) return res.status(404).json({ error: "الحملة غير موجودة" });
    const campaign = await prisma.affiliateCampaign.update({ where: { id: req.params.id }, data: body });
    res.json({ campaign });
  } catch (e) { next(e); }
});

// ---------- AUTH: marketing center ----------
affiliateRouter.get("/marketing", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const items = await prisma.marketingMaterial.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    });
    res.json({ items, code: g.data.code });
  } catch (e) { next(e); }
});

// ---------- AUTH: commissions ----------
affiliateRouter.get("/commissions", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const items = await prisma.commission.findMany({
      where: { affiliateId: g.data.id, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ items });
  } catch (e) { next(e); }
});

// ---------- AUTH: customers ----------
affiliateRouter.get("/customers", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const items = await prisma.affiliateCustomer.findMany({
      where: { affiliateId: g.data.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ items });
  } catch (e) { next(e); }
});

// ---------- AUTH: notifications ----------
affiliateRouter.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const items = await prisma.affiliateNotification.findMany({
      where: { affiliateId: g.data.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ items });
  } catch (e) { next(e); }
});
affiliateRouter.post("/notifications/read-all", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    await prisma.affiliateNotification.updateMany({
      where: { affiliateId: g.data.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- AUTH: update profile ----------
affiliateRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const body = z.object({
      displayName: z.string().min(2).max(120).optional(),
      bio: z.string().max(1000).optional().nullable(),
      website: z.string().max(200).optional().nullable(),
      socialLinks: z.record(z.string(), z.string()).optional().nullable(),
      city: z.string().max(80).optional().nullable(),
      preferredPayout: z.enum(["BANK_SA", "IBAN", "DIGITAL_WALLET", "ACCOUNT_CREDIT", "MANUAL"]).optional(),
    }).parse(req.body);
    const affiliate = await prisma.affiliate.update({
      where: { id: g.data.id },
      data: body as any,
    });
    res.json({ affiliate });
  } catch (e) { next(e); }
});

// ============================================================
// PAYOUT METHODS & ACCOUNTS
// ============================================================
async function ensureDefaultPayoutMethods() {
  const count = await prisma.payoutMethod.count({ where: { isActive: true } });
  if (count > 0) return;
  await prisma.payoutMethod.createMany({
    data: [
      { key: "bank_sa", type: "BANK_SA", name: "تحويل بنكي محلي (SA)", minAmount: 100 as any },
      { key: "iban", type: "IBAN", name: "تحويل عبر IBAN", minAmount: 100 as any },
    ],
    skipDuplicates: true,
  });
}
function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, "").toUpperCase();
  if (clean.length < 8) return clean;
  return clean.slice(0, 4) + "•".repeat(Math.max(0, clean.length - 8)) + clean.slice(-4);
}

affiliateRouter.get("/payout-methods", requireAuth, async (_req, res, next) => {
  try {
    await ensureDefaultPayoutMethods();
    const items = await prisma.payoutMethod.findMany({
      where: { isActive: true }, orderBy: { name: "asc" },
      select: { id: true, key: true, type: true, name: true, minAmount: true, fee: true, feePercent: true },
    });
    res.json({ items });
  } catch (e) { next(e); }
});

affiliateRouter.get("/payout-accounts", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const items = await prisma.affiliatePayoutAccount.findMany({
      where: { affiliateId: g.data.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      include: { method: { select: { id: true, name: true, type: true } } },
    });
    res.json({ items: items.map((a) => ({ ...a, ibanEncrypted: undefined })) });
  } catch (e) { next(e); }
});

const payoutAccountSchema = z.object({
  methodId: z.string().min(1),
  beneficiaryName: z.string().min(3).max(120),
  bankName: z.string().max(80).optional().nullable(),
  iban: z.string().min(15).max(34).regex(/^[A-Z0-9\s]+$/i, "IBAN غير صالح"),
  isDefault: z.boolean().optional(),
});
affiliateRouter.post("/payout-accounts", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    await ensureDefaultPayoutMethods();
    const body = payoutAccountSchema.parse(req.body);
    const method = await prisma.payoutMethod.findUnique({ where: { id: body.methodId } });
    if (!method || !method.isActive) return res.status(400).json({ error: "طريقة الدفع غير متاحة" });
    const cleanIban = body.iban.replace(/\s+/g, "").toUpperCase();

    const acc = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.affiliatePayoutAccount.updateMany({ where: { affiliateId: g.data.id }, data: { isDefault: false } });
      }
      const existingCount = await tx.affiliatePayoutAccount.count({ where: { affiliateId: g.data.id } });
      return tx.affiliatePayoutAccount.create({
        data: {
          affiliateId: g.data.id,
          methodId: body.methodId,
          beneficiaryName: body.beneficiaryName,
          bankName: body.bankName ?? null,
          ibanEncrypted: cleanIban,
          ibanMasked: maskIban(cleanIban),
          isDefault: body.isDefault ?? existingCount === 0,
        },
      });
    });
    res.status(201).json({ account: { ...acc, ibanEncrypted: undefined } });
  } catch (e) { next(e); }
});

affiliateRouter.post("/payout-accounts/:id/default", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const acc = await prisma.affiliatePayoutAccount.findUnique({ where: { id: req.params.id }, select: { affiliateId: true } });
    if (!acc || acc.affiliateId !== g.data.id) return res.status(404).json({ error: "الحساب غير موجود" });
    await prisma.$transaction([
      prisma.affiliatePayoutAccount.updateMany({ where: { affiliateId: g.data.id }, data: { isDefault: false } }),
      prisma.affiliatePayoutAccount.update({ where: { id: req.params.id }, data: { isDefault: true } }),
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

affiliateRouter.delete("/payout-accounts/:id", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const acc = await prisma.affiliatePayoutAccount.findUnique({ where: { id: req.params.id }, select: { affiliateId: true } });
    if (!acc || acc.affiliateId !== g.data.id) return res.status(404).json({ error: "الحساب غير موجود" });
    const openReq = await prisma.withdrawalRequest.count({
      where: { accountId: req.params.id, status: { in: ["NEW", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
    });
    if (openReq > 0) return res.status(400).json({ error: "لا يمكن حذف حساب مرتبط بطلبات سحب نشطة" });
    await prisma.affiliatePayoutAccount.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ============================================================
// WITHDRAWALS (affiliate side)
// ============================================================
affiliateRouter.get("/withdrawals", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const items = await prisma.withdrawalRequest.findMany({
      where: { affiliateId: g.data.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { account: { select: { beneficiaryName: true, bankName: true, ibanMasked: true } } },
    });
    res.json({ items });
  } catch (e) { next(e); }
});

const createWithdrawalSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive().max(1_000_000),
  note: z.string().max(500).optional().nullable(),
});
async function nextWithdrawalNumber(): Promise<string> {
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, "0");
  const d = String(today.getUTCDate()).padStart(2, "0");
  const prefix = `WDR-${y}${m}${d}`;
  const last = await prisma.withdrawalRequest.findFirst({
    where: { requestNumber: { startsWith: prefix } },
    orderBy: { requestNumber: "desc" },
    select: { requestNumber: true },
  });
  const seq = last ? Number(last.requestNumber.slice(-4)) + 1 : 1;
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

affiliateRouter.post("/withdrawals", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const body = createWithdrawalSchema.parse(req.body);
    const affiliateId = g.data.id;

    const account = await prisma.affiliatePayoutAccount.findUnique({
      where: { id: body.accountId }, include: { method: true },
    });
    if (!account || account.affiliateId !== affiliateId) return res.status(400).json({ error: "حساب السحب غير صالح" });
    const method = account.method;
    const min = Number(method.minAmount || 100);
    if (body.amount < min) return res.status(400).json({ error: `الحد الأدنى للسحب ${min} ر.س` });

    // Enforce single active request
    const openCount = await prisma.withdrawalRequest.count({
      where: { affiliateId, status: { in: ["NEW", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
    });
    if (openCount > 0) return res.status(409).json({ error: "لديك طلب سحب قيد المعالجة بالفعل" });

    // Compute withdrawable
    const ledgerRows = await prisma.affiliateLedgerEntry.groupBy({
      by: ["bucket"], where: { affiliateId }, _sum: { amount: true },
    });
    const bucketMap: Record<string, number> = { PENDING: 0, AVAILABLE: 0, RESERVED: 0, PAID: 0 };
    for (const r of ledgerRows) bucketMap[r.bucket] = Number(r._sum.amount || 0);
    const withdrawable = Math.max(0, bucketMap.AVAILABLE - bucketMap.RESERVED);
    if (body.amount > withdrawable) return res.status(400).json({ error: `الرصيد القابل للسحب ${withdrawable.toFixed(2)} ر.س فقط` });

    const feeFixed = Number(method.fee || 0);
    const feePct = Number(method.feePercent || 0);
    const fee = Number((feeFixed + (body.amount * feePct) / 100).toFixed(2));
    const netAmount = Number((body.amount - fee).toFixed(2));
    const requestNumber = await nextWithdrawalNumber();

    const created = await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawalRequest.create({
        data: {
          affiliateId, accountId: account.id, requestNumber,
          amount: body.amount as any, fee: fee as any, netAmount: netAmount as any,
          currency: "SAR", status: "NEW", note: body.note ?? null,
        },
      });
      // Reserve balance: AVAILABLE -amount, RESERVED +amount
      const [lastA, lastR] = await Promise.all([
        tx.affiliateLedgerEntry.findFirst({ where: { affiliateId, bucket: "AVAILABLE" }, orderBy: { createdAt: "desc" } }),
        tx.affiliateLedgerEntry.findFirst({ where: { affiliateId, bucket: "RESERVED" }, orderBy: { createdAt: "desc" } }),
      ]);
      const aBefore = Number(lastA?.balanceAfter || 0);
      const rBefore = Number(lastR?.balanceAfter || 0);
      await tx.affiliateLedgerEntry.createMany({
        data: [
          {
            affiliateId, entryType: "WITHDRAWAL_REQUESTED", bucket: "AVAILABLE",
            amount: -body.amount, currency: "SAR", withdrawalId: w.id,
            balanceBefore: aBefore, balanceAfter: aBefore - body.amount,
            note: `حجز مبلغ لطلب سحب ${requestNumber}`,
          },
          {
            affiliateId, entryType: "WITHDRAWAL_REQUESTED", bucket: "RESERVED",
            amount: body.amount, currency: "SAR", withdrawalId: w.id,
            balanceBefore: rBefore, balanceAfter: rBefore + body.amount,
            note: `حجز مبلغ لطلب سحب ${requestNumber}`,
          },
        ],
      });
      await tx.affiliateNotification.create({
        data: {
          affiliateId,
          title: `تم إنشاء طلب سحب #${requestNumber}`,
          body: `المبلغ: ${body.amount} ر.س — الرسوم: ${fee} — الصافي: ${netAmount}`,
          category: "info",
        },
      });
      return w;
    });

    // WhatsApp: affiliate + admins
    WA.notify(
      g.data.phone || "",
      `ASH HOLDING — تم استلام طلب السحب #${requestNumber} ✅\nالمبلغ: ${body.amount} ر.س\nالرسوم: ${fee} ر.س\nالصافي: ${netAmount} ر.س\nسنقوم بمراجعته خلال 24-48 ساعة.`,
      { kind: "withdrawal.created", entityId: created.id }
    );
    const adminRaw = process.env.ADMIN_WHATSAPP || process.env.ADMIN_PHONE || "";
    for (const p of adminRaw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)) {
      WA.notify(p, `🔔 طلب سحب جديد #${requestNumber}\nالمسوّق: ${g.data.displayName} (${g.data.code})\nالمبلغ: ${body.amount} ر.س — الصافي: ${netAmount}`,
        { kind: "withdrawal.created.admin", entityId: created.id });
    }

    res.status(201).json({ withdrawal: created });
  } catch (e) { next(e); }
});

affiliateRouter.post("/withdrawals/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const g = await requireAffiliate(req.user!.sub);
    if ("error" in g) return res.status(g.status).json({ error: g.error });
    const w = await prisma.withdrawalRequest.findUnique({ where: { id: req.params.id } });
    if (!w || w.affiliateId !== g.data.id) return res.status(404).json({ error: "الطلب غير موجود" });
    if (!["NEW", "UNDER_REVIEW"].includes(w.status)) return res.status(400).json({ error: "لا يمكن إلغاء الطلب في حالته الحالية" });

    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({ where: { id: w.id }, data: { status: "CANCELLED", reviewedAt: new Date() } });
      const [lastR, lastA] = await Promise.all([
        tx.affiliateLedgerEntry.findFirst({ where: { affiliateId: g.data.id, bucket: "RESERVED" }, orderBy: { createdAt: "desc" } }),
        tx.affiliateLedgerEntry.findFirst({ where: { affiliateId: g.data.id, bucket: "AVAILABLE" }, orderBy: { createdAt: "desc" } }),
      ]);
      const rBefore = Number(lastR?.balanceAfter || 0);
      const aBefore = Number(lastA?.balanceAfter || 0);
      const amt = Number(w.amount);
      await tx.affiliateLedgerEntry.createMany({
        data: [
          { affiliateId: g.data.id, entryType: "WITHDRAWAL_RELEASED", bucket: "RESERVED",
            amount: -amt, currency: w.currency, withdrawalId: w.id,
            balanceBefore: rBefore, balanceAfter: rBefore - amt, note: `إلغاء طلب سحب ${w.requestNumber}` },
          { affiliateId: g.data.id, entryType: "WITHDRAWAL_RELEASED", bucket: "AVAILABLE",
            amount: amt, currency: w.currency, withdrawalId: w.id,
            balanceBefore: aBefore, balanceAfter: aBefore + amt, note: `استرجاع المبلغ للمتاح` },
        ],
      });
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- admin/cron: release matured commissions ----------
// POST /api/affiliate/admin/release  (SUPER_ADMIN | ADMIN | AFFILIATE_MANAGER)
//   or via header  X-Cron-Secret: <AFFILIATE_CRON_SECRET>
affiliateRouter.post("/admin/release", (req, res, next) => {
  const headerSecret = req.header("x-cron-secret");
  if (safeEqualSecret(headerSecret, process.env.AFFILIATE_CRON_SECRET)) return next();
  // Otherwise require an authenticated staff/manager user.
  return requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    const user = (req as any).user;
    const allowed = ["SUPER_ADMIN", "ADMIN", "AFFILIATE_MANAGER"];
    if (!user || !allowed.includes(user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  });
}, async (_req, res, next) => {
  try {
    const result = await releaseMaturedCommissions(500);
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});
// Unused-import guard so `requireRole` stays referenced if future admin routes need it.
void requireRole;
