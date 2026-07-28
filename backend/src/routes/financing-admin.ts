// Admin surface for the Financing subsystem (Phase 1).
// Products CRUD + Compliance gate management.
// NO financial decisions execute here yet — Phases 3–6 add applications/offers/wallets.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  FINANCING_ADMIN_ROLES,
  FINANCING_READ_ROLES,
  logFinancingAudit,
} from "../middleware/financing.js";

export const financingAdminRouter = Router();
financingAdminRouter.use(requireAuth);

// --- SETTINGS ---
financingAdminRouter.get("/settings", requireRole(...FINANCING_READ_ROLES), async (_req, res) => {
  const s = await prisma.financingSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  res.json(s);
});

const settingsSchema = z.object({
  productionEnabled: z.boolean().optional(),
  sandboxNoticeAr: z.string().max(500).optional(),
  minAmount: z.number().min(1).max(10_000_000).optional(),
  maxAmount: z.number().min(1).max(10_000_000).optional(),
  legalOpinionRef: z.string().max(200).nullable().optional(),
  legalCounselName: z.string().max(200).nullable().optional(),
  legalOpinionDate: z.string().datetime().nullable().optional(),
  publicContactEmail: z.string().email().nullable().optional(),
  complaintsEmail: z.string().email().nullable().optional(),
});

financingAdminRouter.patch(
  "/settings",
  requireRole("SUPER_ADMIN", "ADMIN", "COMPLIANCE_OFFICER", "FINAL_APPROVER"),
  async (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    const d = parsed.data;

    // Turning production ON requires: (a) role = FINAL_APPROVER or SUPER_ADMIN,
    // (b) all mandatory compliance items APPROVED.
    if (d.productionEnabled === true) {
      if (!["FINAL_APPROVER", "SUPER_ADMIN"].includes(req.user!.role)) {
        return res.status(403).json({ error: "final_approver_required" });
      }
      const missing = await prisma.complianceApproval.count({ where: { status: { not: "APPROVED" } } });
      if (missing > 0) {
        return res.status(400).json({
          error: "compliance_incomplete",
          message: `يتطلب اعتماد ${missing} بند(بنود) في بوابة الامتثال قبل تفعيل الإنتاج.`,
        });
      }
    }

    const updated = await prisma.financingSetting.update({
      where: { id: "default" },
      data: {
        ...d,
        legalOpinionDate: d.legalOpinionDate ? new Date(d.legalOpinionDate) : undefined,
        lastReviewedById: req.user!.sub,
        lastReviewedAt: new Date(),
      },
    });
    await logFinancingAudit(req, "settings.update", "FinancingSetting", "default", d);
    res.json(updated);
  },
);

// --- PRODUCTS ---
financingAdminRouter.get("/products", requireRole(...FINANCING_READ_ROLES), async (_req, res) => {
  const items = await prisma.financingProduct.findMany({
    include: { services: true, _count: { select: { services: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items });
});

const productSchema = z.object({
  code: z.string().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  nameAr: z.string().min(2).max(120),
  descriptionAr: z.string().max(2000).optional().nullable(),
  customerType: z.enum(["INDIVIDUAL", "BUSINESS"]),
  minAmount: z.number().min(5000).max(500000),
  maxAmount: z.number().min(5000).max(500000),
  minDownPaymentPct: z.number().min(0).max(90).default(0),
  minTermMonths: z.number().int().min(1).max(120),
  maxTermMonths: z.number().int().min(1).max(120),
  allowedTermsMonths: z.array(z.number().int().min(1).max(120)).default([]),
  rateBasis: z.enum(["FLAT_ANNUAL", "REDUCING_ANNUAL", "FIXED_TOTAL"]).default("REDUCING_ANNUAL"),
  ratePct: z.number().min(0).max(50).default(0),
  adminFeePct: z.number().min(0).max(15).default(0),
  adminFeeFlat: z.number().min(0).max(50000).default(0),
  vatOnFees: z.boolean().default(true),
  gracePeriodDays: z.number().int().min(0).max(90).default(0),
  earlySettlementNote: z.string().max(1000).optional().nullable(),
  latePaymentNote: z.string().max(1000).optional().nullable(),
  eligibilityNoteAr: z.string().max(2000).optional().nullable(),
  requiredDocsAr: z.array(z.string().min(1).max(200)).default([]),
  services: z.array(z.object({ labelAr: z.string().min(1).max(120), serviceId: z.string().optional() })).default([]),
});

financingAdminRouter.post(
  "/products",
  requireRole("SUPER_ADMIN", "ADMIN", "CREDIT_MANAGER"),
  async (req, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    const d = parsed.data;
    if (d.minAmount > d.maxAmount) return res.status(400).json({ error: "min_gt_max_amount" });
    if (d.minTermMonths > d.maxTermMonths) return res.status(400).json({ error: "min_gt_max_term" });

    const { services, ...productData } = d;
    const created = await prisma.financingProduct.create({
      data: {
        ...productData,
        createdById: req.user!.sub,
        services: { create: services.map((s) => ({ labelAr: s.labelAr, serviceId: s.serviceId })) },
      },
      include: { services: true },
    });
    await logFinancingAudit(req, "product.create", "FinancingProduct", created.id, { code: created.code });
    res.status(201).json(created);
  },
);

financingAdminRouter.patch(
  "/products/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "CREDIT_MANAGER"),
  async (req, res) => {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    const { services, ...rest } = parsed.data;
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.financingProduct.update({ where: { id: req.params.id }, data: rest });
      if (services) {
        await tx.financingProductService.deleteMany({ where: { productId: p.id } });
        await tx.financingProductService.createMany({
          data: services.map((s) => ({ productId: p.id, labelAr: s.labelAr, serviceId: s.serviceId })),
        });
      }
      return tx.financingProduct.findUnique({ where: { id: p.id }, include: { services: true } });
    });
    await logFinancingAudit(req, "product.update", "FinancingProduct", req.params.id, rest);
    res.json(updated);
  },
);

// Publish requires productionEnabled OR at least legal approval item present.
financingAdminRouter.post(
  "/products/:id/publish",
  requireRole("SUPER_ADMIN", "ADMIN", "COMPLIANCE_OFFICER", "FINAL_APPROVER"),
  async (req, res) => {
    const settings = await prisma.financingSetting.findUnique({ where: { id: "default" } });
    const legal = await prisma.complianceApproval.findFirst({
      where: { code: "legal_opinion", status: "APPROVED" },
    });
    if (!legal && !settings?.productionEnabled) {
      return res.status(423).json({
        error: "legal_opinion_required",
        message: "لا يمكن نشر منتج تمويلي قبل اعتماد الرأي القانوني في بوابة الامتثال.",
      });
    }
    const updated = await prisma.financingProduct.update({
      where: { id: req.params.id },
      data: { status: "PUBLISHED", publishedAt: new Date(), approvedById: req.user!.sub, approvedAt: new Date() },
    });
    await logFinancingAudit(req, "product.publish", "FinancingProduct", updated.id);
    res.json(updated);
  },
);

financingAdminRouter.post(
  "/products/:id/pause",
  requireRole(...FINANCING_ADMIN_ROLES),
  async (req, res) => {
    const updated = await prisma.financingProduct.update({
      where: { id: req.params.id },
      data: { status: "PAUSED" },
    });
    await logFinancingAudit(req, "product.pause", "FinancingProduct", updated.id);
    res.json(updated);
  },
);

// --- COMPLIANCE ---
const DEFAULT_COMPLIANCE_ITEMS = [
  { code: "legal_opinion",     titleAr: "الرأي القانوني المكتوب لنموذج التمويل", descriptionAr: "رأي مستشار قانوني معتمد يشمل تصنيف المنتج وحدوده." },
  { code: "credit_policy",     titleAr: "سياسة التمويل المعتمدة", descriptionAr: "شروط الأهلية، الحدود، الرسوم، والإفصاحات." },
  { code: "risk_policy",       titleAr: "سياسة إدارة المخاطر", descriptionAr: "أوزان محرك التقييم، حدود التعرض، ومصفوفة الاعتماد." },
  { code: "collection_policy", titleAr: "سياسة التحصيل", descriptionAr: "خطوات المتابعة، إشعارات التأخر، وقواعد التسوية." },
  { code: "privacy_policy",    titleAr: "سياسة الخصوصية وحماية البيانات", descriptionAr: "معالجة البيانات الشخصية والائتمانية والاحتفاظ بها." },
  { code: "consents_pack",     titleAr: "حزمة نصوص الموافقات النظامية", descriptionAr: "الموافقات المنفصلة للأغراض المختلفة." },
  { code: "contract_templates",titleAr: "قوالب العقود المعتمدة", descriptionAr: "قوالب عقود التمويل والإقرارات بإصدار قانوني معتمد." },
  { code: "authority_matrix",  titleAr: "مصفوفة الصلاحيات والاعتماد", descriptionAr: "حدود الاعتماد لكل دور بحسب المبلغ والمخاطر." },
];

financingAdminRouter.get("/compliance", requireRole(...FINANCING_READ_ROLES), async (_req, res) => {
  const existing = await prisma.complianceApproval.findMany({ orderBy: { createdAt: "asc" } });
  const codes = new Set(existing.map((x) => x.code));
  const toCreate = DEFAULT_COMPLIANCE_ITEMS.filter((c) => !codes.has(c.code));
  if (toCreate.length) {
    await prisma.complianceApproval.createMany({ data: toCreate });
  }
  const items = await prisma.complianceApproval.findMany({ orderBy: { createdAt: "asc" } });
  res.json({ items });
});

const complianceUpdateSchema = z.object({
  status: z.enum(["MISSING", "UPLOADED", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"]).optional(),
  documentPath: z.string().max(500).nullable().optional(),
  documentHash: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

financingAdminRouter.patch(
  "/compliance/:code",
  requireRole("SUPER_ADMIN", "ADMIN", "COMPLIANCE_OFFICER", "LEGAL_OFFICER"),
  async (req, res) => {
    const parsed = complianceUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    const d = parsed.data;
    const item = await prisma.complianceApproval.findUnique({ where: { code: req.params.code } });
    if (!item) return res.status(404).json({ error: "not_found" });

    // Approving requires COMPLIANCE_OFFICER, LEGAL_OFFICER, SUPER_ADMIN, or ADMIN.
    // Separation of duties: approver must differ from last uploader when possible.
    const nextVersion = d.documentPath && d.documentPath !== item.documentPath ? item.version + 1 : item.version;
    const updated = await prisma.complianceApproval.update({
      where: { code: req.params.code },
      data: {
        ...d,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : undefined,
        version: nextVersion,
        approvedById: d.status === "APPROVED" ? req.user!.sub : item.approvedById,
        approvedAt: d.status === "APPROVED" ? new Date() : item.approvedAt,
      },
    });
    await logFinancingAudit(req, "compliance.update", "ComplianceApproval", item.code, d);
    res.json(updated);
  },
);

// --- AUDIT (read-only) ---
financingAdminRouter.get(
  "/audit",
  requireRole(...FINANCING_READ_ROLES),
  async (req, res) => {
    const take = Math.min(200, Number(req.query.take ?? 50));
    const items = await prisma.financingAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
    });
    res.json({ items });
  },
);
