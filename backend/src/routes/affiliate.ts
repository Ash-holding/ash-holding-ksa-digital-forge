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
import { requireAuth } from "../middleware/auth.js";
import { WA } from "../lib/whatsapp.js";

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

affiliateRouter.post("/apply", async (req, res, next) => {
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
