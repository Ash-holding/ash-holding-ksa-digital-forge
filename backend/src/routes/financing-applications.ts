// Client-facing Financing application lifecycle.
// Wizard save (PATCH), document upload, submit, list, get, cancel.
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { currentClientId, isStaff } from "../lib/scope.js";
import { computeQuote } from "../lib/financing/calculator.js";
import { appendEvent, computeInternalScore, notifyApplicant, STATUS_LABEL_AR, bankMessage } from "../lib/financing/lifecycle.js";
import { computeInternalCreditReport } from "../lib/financing/credit-report.js";

export const financingApplicationsRouter = Router();
financingApplicationsRouter.use(requireAuth);

// ---------- upload storage ----------
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(path.join(uploadRoot, "financing"), { recursive: true });
const maxMb = Number(process.env.UPLOAD_MAX_MB || 25);
const allowedMimes = new Set([
  "image/png", "image/jpeg", "image/webp", "application/pdf",
]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const d = new Date();
    const dir = path.join(uploadRoot, "financing", String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, "0"));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const id = crypto.randomBytes(10).toString("hex");
    cb(null, `${id}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) return cb(null, true);
    cb(new Error("نوع الملف غير مسموح — يُسمح بالصور وPDF فقط."));
  },
});

// ---------- helpers ----------
function newAppCode() {
  const n = crypto.randomInt(100000, 999999);
  return `FIN-${n}`;
}

async function loadOwned(id: string, userId: string, allowStaff = false) {
  const app = await prisma.financingApplication.findUnique({
    where: { id },
    include: { documents: true, events: { orderBy: { createdAt: "asc" } }, product: true, decisions: { orderBy: { createdAt: "asc" } } },
  });
  if (!app) return null;
  if (app.applicantId !== userId && !allowStaff) return null;
  return app;
}

// ---------- CREATE DRAFT ----------
const createSchema = z.object({
  productId: z.string().min(1),
  amount: z.number().min(1),
  downPayment: z.number().min(0).default(0),
  termMonths: z.number().int().min(1).max(120),
  serviceLabel: z.string().max(200).optional(),
  purposeAr: z.string().max(2000).optional(),
});

financingApplicationsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    const d = parsed.data;
    const product = await prisma.financingProduct.findUnique({ where: { id: d.productId } });
    if (!product || product.status !== "PUBLISHED") return res.status(404).json({ error: "product_not_available" });

    // clamp within product bounds
    const amount = Math.min(Number(product.maxAmount), Math.max(Number(product.minAmount), d.amount));
    const term = Math.min(product.maxTermMonths, Math.max(product.minTermMonths, d.termMonths));
    const minDown = Math.ceil((Number(product.minDownPaymentPct) / 100) * amount);
    const downPayment = Math.max(minDown, Math.min(amount, d.downPayment));

    const quote = computeQuote({
      amount, downPayment, termMonths: term,
      rateBasis: product.rateBasis,
      ratePct: Number(product.ratePct),
      adminFeePct: Number(product.adminFeePct),
      adminFeeFlat: Number(product.adminFeeFlat),
      vatOnFees: product.vatOnFees,
    });

    const cid = await currentClientId(req);
    const app = await prisma.financingApplication.create({
      data: {
        code: newAppCode(),
        applicantId: req.user!.sub,
        clientId: cid,
        productId: product.id,
        amount, downPayment, termMonths: term,
        serviceLabel: d.serviceLabel,
        purposeAr: d.purposeAr,
        quoteSnapshot: quote as never,
      },
    });
    await appendEvent({ applicationId: app.id, actorId: req.user!.sub, actorRole: req.user!.role, type: "created", toStatus: "DRAFT", message: "إنشاء مسودة طلب تمويل" });
    res.status(201).json(app);
  } catch (e) { next(e); }
});

// ---------- LIST OWN ----------
financingApplicationsRouter.get("/", async (req, res, next) => {
  try {
    const rows = await prisma.financingApplication.findMany({
      where: { applicantId: req.user!.sub },
      include: { product: { select: { nameAr: true, code: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ rows });
  } catch (e) { next(e); }
});

// ---------- GET ONE ----------
financingApplicationsRouter.get("/:id", async (req, res, next) => {
  try {
    const staff = isStaff(req);
    const app = await loadOwned(req.params.id, req.user!.sub, staff);
    if (!app) return res.status(404).json({ error: "not_found" });
    res.json(app);
  } catch (e) { next(e); }
});

// ---------- PATCH DRAFT ----------
const patchSchema = z.object({
  amount: z.number().min(1).optional(),
  downPayment: z.number().min(0).optional(),
  termMonths: z.number().int().min(1).max(120).optional(),
  serviceLabel: z.string().max(200).nullable().optional(),
  purposeAr: z.string().max(2000).nullable().optional(),
  fullNameAr: z.string().max(200).nullable().optional(),
  nationalId: z.string().max(20).nullable().optional(),
  birthDate: z.string().datetime().nullable().optional(),
  employer: z.string().max(200).nullable().optional(),
  jobTitle: z.string().max(200).nullable().optional(),
  employmentType: z.enum(["GOV", "PRIVATE", "SELF", "RETIRED", "OTHER"]).nullable().optional(),
  yearsOfService: z.number().int().min(0).max(60).nullable().optional(),
  monthlyIncome: z.number().min(0).max(1_000_000).nullable().optional(),
  monthlyObligations: z.number().min(0).max(1_000_000).nullable().optional(),
  businessName: z.string().max(200).nullable().optional(),
  crNumber: z.string().max(50).nullable().optional(),
  vatNumber: z.string().max(50).nullable().optional(),
  annualRevenue: z.number().min(0).max(100_000_000).nullable().optional(),
  consentTerms: z.boolean().optional(),
  consentDataUse: z.boolean().optional(),
  consentCreditCheck: z.boolean().optional(),
});

financingApplicationsRouter.patch("/:id", async (req, res, next) => {
  try {
    const app = await loadOwned(req.params.id, req.user!.sub);
    if (!app) return res.status(404).json({ error: "not_found" });
    if (app.status !== "DRAFT" && app.status !== "MORE_INFO") {
      return res.status(400).json({ error: "not_editable", message: "لا يمكن تعديل الطلب بعد التقديم." });
    }
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    const d = parsed.data;
    const data: Record<string, unknown> = { ...d };
    if (d.birthDate) data.birthDate = new Date(d.birthDate);
    const updated = await prisma.financingApplication.update({ where: { id: app.id }, data });
    res.json(updated);
  } catch (e) { next(e); }
});

// ---------- UPLOAD DOC ----------
financingApplicationsRouter.post("/:id/documents", upload.single("file"), async (req, res, next) => {
  try {
    const app = await loadOwned(req.params.id, req.user!.sub);
    if (!app) return res.status(404).json({ error: "not_found" });
    if (!req.file) return res.status(400).json({ error: "no_file" });
    const code = String(req.body.code || "other").slice(0, 60);
    const labelAr = String(req.body.labelAr || "مستند").slice(0, 200);
    const relPath = path.relative(uploadRoot, req.file.path).split(path.sep).join("/");
    const publicUrl = `/uploads/${relPath}`;

    const doc = await prisma.financingApplicationDocument.create({
      data: {
        applicationId: app.id,
        code, labelAr,
        filePath: publicUrl,
        fileMime: req.file.mimetype,
        fileSize: req.file.size,
        uploadedById: req.user!.sub,
      },
    });
    await appendEvent({ applicationId: app.id, actorId: req.user!.sub, actorRole: req.user!.role, type: "doc_uploaded", message: `رفع مستند: ${labelAr}` });
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

// delete a draft doc
financingApplicationsRouter.delete("/:id/documents/:docId", async (req, res, next) => {
  try {
    const app = await loadOwned(req.params.id, req.user!.sub);
    if (!app) return res.status(404).json({ error: "not_found" });
    if (app.status !== "DRAFT" && app.status !== "MORE_INFO") return res.status(400).json({ error: "not_editable" });
    await prisma.financingApplicationDocument.deleteMany({ where: { id: req.params.docId, applicationId: app.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- SUBMIT ----------
financingApplicationsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const app = await loadOwned(req.params.id, req.user!.sub);
    if (!app) return res.status(404).json({ error: "not_found" });
    if (app.status !== "DRAFT" && app.status !== "MORE_INFO") {
      return res.status(400).json({ error: "not_submittable" });
    }
    // Basic completeness checks
    const missing: string[] = [];
    if (!app.fullNameAr) missing.push("الاسم");
    if (!app.nationalId) missing.push("رقم الهوية");
    if (!app.consentTerms || !app.consentDataUse || !app.consentCreditCheck) missing.push("الموافقات القانونية");
    if (app.documents.length < 1) missing.push("مستند واحد على الأقل");
    if (missing.length) return res.status(400).json({ error: "incomplete", missing });

    const score = computeInternalScore({
      monthlyIncome: app.monthlyIncome ? Number(app.monthlyIncome) : null,
      monthlyObligations: app.monthlyObligations ? Number(app.monthlyObligations) : null,
      amount: Number(app.amount),
      termMonths: app.termMonths,
      yearsOfService: app.yearsOfService,
    });

    const updated = await prisma.financingApplication.update({
      where: { id: app.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        computedScore: score,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await appendEvent({
      applicationId: app.id, actorId: req.user!.sub, actorRole: req.user!.role,
      type: "submitted", fromStatus: app.status, toStatus: "SUBMITTED",
      message: `تم تقديم الطلب — سيتم بدء المراجعة (النقاط الأولية: ${score}/100)`,
    });
    await notifyApplicant(app.id, `📝 تم استلام طلب التمويل ${app.code} — سيبدأ فريق آش المراجعة خلال ساعات العمل.`);
    res.json(updated);
  } catch (e) { next(e); }
});

// ---------- CANCEL ----------
financingApplicationsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const app = await loadOwned(req.params.id, req.user!.sub);
    if (!app) return res.status(404).json({ error: "not_found" });
    const terminal = ["APPROVED", "REJECTED", "CANCELLED", "EXPIRED"];
    if (terminal.includes(app.status)) return res.status(400).json({ error: "already_final" });
    const updated = await prisma.financingApplication.update({
      where: { id: app.id },
      data: { status: "CANCELLED" },
    });
    await appendEvent({ applicationId: app.id, actorId: req.user!.sub, actorRole: req.user!.role, type: "cancelled", fromStatus: app.status, toStatus: "CANCELLED", message: "ألغى المتقدم الطلب" });
    res.json(updated);
  } catch (e) { next(e); }
});

// expose helper for admin
export { STATUS_LABEL_AR };
