// Admin surface for financing applications review (Phase 3).
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  FINANCING_READ_ROLES,
  logFinancingAudit,
  requireProductionEnabled,
} from "../middleware/financing.js";
import {
  STAGE_ROLES, NEXT_ON_APPROVE, STAGE_FOR_STATUS,
  appendEvent, notifyApplicant, STATUS_LABEL_AR,
} from "../lib/financing/lifecycle.js";
import type { FinancingApplicationStatus, FinancingDecisionStage } from "@prisma/client";

export const financingApplicationsAdminRouter = Router();
financingApplicationsAdminRouter.use(requireAuth);

// LIST
financingApplicationsAdminRouter.get("/", requireRole(...FINANCING_READ_ROLES), async (req, res, next) => {
  try {
    const status = req.query.status as FinancingApplicationStatus | undefined;
    const q = (req.query.q as string | undefined)?.trim();
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { fullNameAr: { contains: q, mode: "insensitive" } },
        { nationalId: { contains: q } },
      ];
    }
    const rows = await prisma.financingApplication.findMany({
      where,
      include: {
        product: { select: { nameAr: true, code: true, customerType: true } },
        _count: { select: { documents: true, decisions: true } },
      },
      orderBy: [{ status: "asc" }, { submittedAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    res.json({ rows });
  } catch (e) { next(e); }
});

// GET DETAIL
financingApplicationsAdminRouter.get("/:id", requireRole(...FINANCING_READ_ROLES), async (req, res, next) => {
  try {
    const app = await prisma.financingApplication.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
        documents: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
        decisions: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!app) return res.status(404).json({ error: "not_found" });
    const applicant = await prisma.user.findUnique({
      where: { id: app.applicantId },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    res.json({ ...app, applicant });
  } catch (e) { next(e); }
});

// REVIEW DOCUMENT (approve/reject a single uploaded doc)
const docReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "UNDER_REVIEW"]),
  notes: z.string().max(1000).optional(),
});
financingApplicationsAdminRouter.patch(
  "/:id/documents/:docId",
  requireRole("COMPLIANCE_OFFICER", "ADMIN", "SUPER_ADMIN", "LEGAL_OFFICER"),
  async (req, res, next) => {
    try {
      const parsed = docReviewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
      const doc = await prisma.financingApplicationDocument.findFirst({
        where: { id: req.params.docId, applicationId: req.params.id },
      });
      if (!doc) return res.status(404).json({ error: "not_found" });
      const updated = await prisma.financingApplicationDocument.update({
        where: { id: doc.id },
        data: {
          status: parsed.data.status,
          notes: parsed.data.notes,
          reviewedById: req.user!.sub,
          reviewedAt: new Date(),
        },
      });
      await appendEvent({
        applicationId: doc.applicationId,
        actorId: req.user!.sub, actorRole: req.user!.role,
        type: "doc_reviewed",
        message: `${parsed.data.status === "APPROVED" ? "اعتماد" : parsed.data.status === "REJECTED" ? "رفض" : "قيد المراجعة"} مستند: ${doc.labelAr}`,
        metadata: { docId: doc.id, notes: parsed.data.notes },
      });
      await logFinancingAudit(req, "application.doc.review", "FinancingApplicationDocument", doc.id, parsed.data);
      res.json(updated);
    } catch (e) { next(e); }
  },
);

// DECISION (stage-based)
const decisionSchema = z.object({
  stage: z.enum(["KYC", "CREDIT", "RISK", "COMMITTEE", "FINAL"]),
  outcome: z.enum(["APPROVE", "REJECT", "REQUEST_INFO", "ESCALATE"]),
  score: z.number().int().min(0).max(100).optional(),
  notesAr: z.string().max(2000).optional(),
  rejectionReasonAr: z.string().max(1000).optional(),
});

financingApplicationsAdminRouter.post(
  "/:id/decisions",
  requireRole(...FINANCING_READ_ROLES),
  async (req, res, next) => {
    try {
      const parsed = decisionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
      const d = parsed.data;

      const app = await prisma.financingApplication.findUnique({ where: { id: req.params.id } });
      if (!app) return res.status(404).json({ error: "not_found" });
      if (["APPROVED", "REJECTED", "CANCELLED", "EXPIRED"].includes(app.status)) {
        return res.status(400).json({ error: "already_final" });
      }

      // Enforce stage matches current status
      const expected = STAGE_FOR_STATUS[app.status];
      if (!expected) return res.status(400).json({ error: "no_stage_for_status", status: app.status });
      if (expected !== d.stage) return res.status(400).json({ error: "wrong_stage", expected });

      // Enforce role for stage
      const allowed = STAGE_ROLES[d.stage as FinancingDecisionStage];
      if (!allowed.includes(req.user!.role)) {
        return res.status(403).json({ error: "role_not_allowed_for_stage", allowedRoles: allowed });
      }

      // FINAL approval requires productionEnabled
      if (d.stage === "FINAL" && d.outcome === "APPROVE") {
        const settings = await prisma.financingSetting.findUnique({ where: { id: "default" } });
        if (!settings?.productionEnabled) {
          return res.status(423).json({
            error: "financing_sandbox_locked",
            message: "لا يمكن الاعتماد النهائي قبل تفعيل بيئة الإنتاج من بوابة الامتثال.",
          });
        }
      }

      // Compute new status
      let newStatus: FinancingApplicationStatus = app.status;
      if (d.outcome === "APPROVE") {
        // set the intermediate approved state for KYC display, then jump to next review
        newStatus = NEXT_ON_APPROVE[d.stage as FinancingDecisionStage];
      } else if (d.outcome === "REJECT") {
        newStatus = d.stage === "KYC" ? "KYC_REJECTED" : "REJECTED";
      } else if (d.outcome === "REQUEST_INFO") {
        newStatus = "MORE_INFO";
      } else if (d.outcome === "ESCALATE") {
        // move forward one stage without approval mark
        newStatus = NEXT_ON_APPROVE[d.stage as FinancingDecisionStage];
      }

      const decision = await prisma.financingApplicationDecision.create({
        data: {
          applicationId: app.id,
          stage: d.stage,
          outcome: d.outcome,
          reviewerId: req.user!.sub,
          reviewerRole: req.user!.role,
          score: d.score,
          notesAr: d.notesAr,
        },
      });

      const updated = await prisma.financingApplication.update({
        where: { id: app.id },
        data: {
          status: newStatus,
          rejectionReasonAr: d.outcome === "REJECT" ? d.rejectionReasonAr ?? d.notesAr : undefined,
          finalApprovedById: d.stage === "FINAL" && d.outcome === "APPROVE" ? req.user!.sub : undefined,
          finalApprovedAt: d.stage === "FINAL" && d.outcome === "APPROVE" ? new Date() : undefined,
        },
      });

      await appendEvent({
        applicationId: app.id, actorId: req.user!.sub, actorRole: req.user!.role,
        type: "decision", fromStatus: app.status, toStatus: newStatus,
        message: `قرار ${d.stage} — ${d.outcome}${d.notesAr ? `: ${d.notesAr}` : ""}`,
        metadata: { decisionId: decision.id, score: d.score },
      });
      await logFinancingAudit(req, "application.decision", "FinancingApplication", app.id, {
        stage: d.stage, outcome: d.outcome, newStatus,
      });

      // Notify applicant on meaningful transitions
      const msg =
        d.outcome === "APPROVE" && d.stage === "FINAL"
          ? `✅ تمت الموافقة النهائية على طلب التمويل ${app.code}. سيتم إشعارك بخطوات تفعيل الرصيد.`
          : d.outcome === "REJECT"
            ? `❌ نأسف — تم رفض طلب التمويل ${app.code}. ${d.rejectionReasonAr || d.notesAr || ""}`.trim()
            : d.outcome === "REQUEST_INFO"
              ? `ℹ️ طلب التمويل ${app.code} بحاجة لمعلومات/مستندات إضافية. الرجاء مراجعة بوابتك.`
              : `🔄 تحديث حالة طلب التمويل ${app.code}: ${STATUS_LABEL_AR[newStatus]}`;
      await notifyApplicant(app.id, msg);

      res.json({ application: updated, decision });
    } catch (e) { next(e); }
  },
);

// TAKE (assign self as reviewer for current stage — moves SUBMITTED → KYC_REVIEW etc.)
financingApplicationsAdminRouter.post("/:id/take", requireRole(...FINANCING_READ_ROLES), async (req, res, next) => {
  try {
    const app = await prisma.financingApplication.findUnique({ where: { id: req.params.id } });
    if (!app) return res.status(404).json({ error: "not_found" });
    const transitions: Partial<Record<FinancingApplicationStatus, FinancingApplicationStatus>> = {
      SUBMITTED: "KYC_REVIEW",
      KYC_APPROVED: "CREDIT_REVIEW",
    };
    const next = transitions[app.status];
    if (!next) return res.status(400).json({ error: "no_transition_from", status: app.status });
    const stage = STAGE_FOR_STATUS[next]!;
    const allowed = STAGE_ROLES[stage];
    if (!allowed.includes(req.user!.role)) return res.status(403).json({ error: "role_not_allowed_for_stage", allowedRoles: allowed });
    const updated = await prisma.financingApplication.update({ where: { id: app.id }, data: { status: next } });
    await appendEvent({
      applicationId: app.id, actorId: req.user!.sub, actorRole: req.user!.role,
      type: "take", fromStatus: app.status, toStatus: next,
      message: `تم تسلّم الطلب للمراجعة (${STATUS_LABEL_AR[next]})`,
    });
    res.json(updated);
  } catch (e) { next(e); }
});

// ADMIN NOTE (freeform)
financingApplicationsAdminRouter.post("/:id/notes", requireRole(...FINANCING_READ_ROLES), async (req, res, next) => {
  try {
    const text = z.object({ message: z.string().min(1).max(2000) }).safeParse(req.body);
    if (!text.success) return res.status(400).json({ error: "invalid_input" });
    await appendEvent({
      applicationId: req.params.id, actorId: req.user!.sub, actorRole: req.user!.role,
      type: "note", message: text.data.message,
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ENABLE-PROD SHIM (used for testing decision engine locks)
void requireProductionEnabled; // referenced elsewhere; keep import stable
