// Phase 6 — Early settlement, risk actions, and public disclosures
import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ensureWallet } from "./wallet.js";
import { WA } from "../lib/whatsapp.js";
import { logAudit } from "../lib/audit.js";

const STAFF_ROLES = [
  "ADMIN", "SUPER_ADMIN", "CFO", "CREDIT_MANAGER",
  "FINAL_APPROVER", "CREDIT_COMMITTEE", "OPERATIONS",
] as const;

function isStaff(role?: string) {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

function d(v: Prisma.Decimal | number | string | null | undefined) {
  return v == null ? 0 : Number(v.toString());
}

// ============================================================
// Payoff calculator
// Payoff = sum(pending principal) + accrued interest on current period
//        + early repayment fee (SAMA-compliant cap ≤ 1% of outstanding)
//        - interest rebate (remaining future interest not yet accrued)
// ============================================================
async function calcPayoff(contractId: string) {
  const contract = await prisma.financingContract.findUnique({
    where: { id: contractId },
    include: { installments: { orderBy: { n: "asc" } } },
  });
  if (!contract) throw new Error("contract_not_found");
  if (contract.status !== "ACTIVE" && contract.status !== "DEFAULTED") {
    throw new Error("contract_not_settleable");
  }

  const pending = contract.installments.filter((i) => i.status === "PENDING" || i.status === "OVERDUE");
  const outstandingPrincipal = pending.reduce((s, i) => s + d(i.principal), 0);
  const remainingInterest = pending.reduce((s, i) => s + d(i.interest) + d(i.fees), 0);

  // Accrued interest = one installment's interest portion max (conservative)
  const next = pending[0];
  const accruedInterest = next ? d(next.interest) : 0;
  const interestRebate = Math.max(0, remainingInterest - accruedInterest);

  // Early repayment fee — capped at 1% of outstanding principal (SAMA guidance)
  const earlyRepaymentFee = Math.round(outstandingPrincipal * 0.01 * 100) / 100;

  const totalPayoff = Math.max(0, outstandingPrincipal + accruedInterest + earlyRepaymentFee - 0);

  return {
    contract,
    outstandingPrincipal,
    accruedInterest,
    earlyRepaymentFee,
    interestRebate,
    totalPayoff,
  };
}

// ==================================================================================
// PROTECTED ROUTER
// ==================================================================================
export const financingClosureRouter = Router();
financingClosureRouter.use(requireAuth);

// --------- Quote payoff (client or staff) ---------
financingClosureRouter.get("/contracts/:id/early-settlement/quote", async (req, res, next) => {
  try {
    const q = await calcPayoff(req.params.id);
    if (!isStaff(req.user!.role) && q.contract.applicantId !== req.user!.id) {
      return res.status(403).json({ error: "forbidden" });
    }
    res.json({
      contractCode: q.contract.code,
      outstandingPrincipal: q.outstandingPrincipal,
      accruedInterest: q.accruedInterest,
      earlyRepaymentFee: q.earlyRepaymentFee,
      interestRebate: q.interestRebate,
      totalPayoff: q.totalPayoff,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "contract_not_found") return res.status(404).json({ error: msg });
    if (msg === "contract_not_settleable") return res.status(400).json({ error: msg });
    next(e);
  }
});

// --------- Client requests early settlement ---------
financingClosureRouter.post("/contracts/:id/early-settlement", async (req, res, next) => {
  try {
    const body = z.object({ note: z.string().max(1000).optional() }).parse(req.body ?? {});
    const q = await calcPayoff(req.params.id);
    if (q.contract.applicantId !== req.user!.id && !isStaff(req.user!.role)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const existing = await prisma.financingEarlySettlement.findFirst({
      where: { contractId: q.contract.id, status: { in: ["REQUESTED", "APPROVED"] } },
    });
    if (existing) return res.status(409).json({ error: "already_requested", request: existing });

    const request = await prisma.financingEarlySettlement.create({
      data: {
        contractId: q.contract.id,
        requestedById: req.user!.id,
        status: "REQUESTED",
        outstandingPrincipal: new Prisma.Decimal(q.outstandingPrincipal),
        accruedInterest: new Prisma.Decimal(q.accruedInterest),
        earlyRepaymentFee: new Prisma.Decimal(q.earlyRepaymentFee),
        interestRebate: new Prisma.Decimal(q.interestRebate),
        totalPayoff: new Prisma.Decimal(q.totalPayoff),
        clientNote: body.note ?? null,
      },
    });
    await logAudit(req, "financing.early_settlement.request", "FinancingContract", q.contract.id, {
      requestId: request.id, totalPayoff: q.totalPayoff,
    });
    await WA.notify(q.contract.applicantId, `📥 تم استلام طلب السداد المبكر للعقد ${q.contract.code}.\nقيمة السداد: ${q.totalPayoff.toFixed(2)} ريال\nسنعلمك فور مراجعته.`);
    res.json({ request });
  } catch (e) { next(e); }
});

// --------- Admin approves & executes payoff (debits wallet, closes) ---------
financingClosureRouter.post(
  "/admin/early-settlement/:requestId/approve",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const body = z.object({ adminNote: z.string().max(1000).optional() }).parse(req.body ?? {});
      const request = await prisma.financingEarlySettlement.findUnique({ where: { id: req.params.requestId } });
      if (!request) return res.status(404).json({ error: "request_not_found" });
      if (request.status !== "REQUESTED") return res.status(400).json({ error: "invalid_status" });

      const contract = await prisma.financingContract.findUnique({
        where: { id: request.contractId },
        include: { installments: true },
      });
      if (!contract) return res.status(404).json({ error: "contract_not_found" });

      const wallet = await ensureWallet(contract.applicantId);
      const payoff = d(request.totalPayoff);
      if (d(wallet.balance) < payoff) {
        return res.status(400).json({ error: "insufficient_wallet_balance", needed: payoff, balance: d(wallet.balance) });
      }

      const result = await prisma.$transaction(async (tx) => {
        // debit wallet
        const tx1 = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "FINANCING_INSTALLMENT",
            status: "APPROVED",
            amount: new Prisma.Decimal(-payoff),
            note: `سداد مبكر — عقد ${contract.code}`,
          },
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: new Prisma.Decimal(d(wallet.balance) - payoff) },
        });
        // waive all pending/overdue installments
        await tx.financingInstallment.updateMany({
          where: { contractId: contract.id, status: { in: ["PENDING", "OVERDUE"] } },
          data: { status: "WAIVED", note: "سداد مبكر", paidAt: new Date() },
        });
        // close contract
        const updated = await tx.financingContract.update({
          where: { id: contract.id },
          data: { status: "EARLY_SETTLED" },
        });
        // update request
        const done = await tx.financingEarlySettlement.update({
          where: { id: request.id },
          data: {
            status: "SETTLED",
            approvedById: req.user!.id,
            approvedAt: new Date(),
            settledAt: new Date(),
            settlementTxId: tx1.id,
            adminNote: body.adminNote ?? null,
          },
        });
        return { updated, done };
      });

      await logAudit(req, "financing.early_settlement.settle", "FinancingContract", contract.id, {
        requestId: request.id, payoff,
      });
      await WA.notify(contract.applicantId, `✅ تم إغلاق عقد التمويل ${contract.code} بنجاح (سداد مبكر).\nالمبلغ المخصوم: ${payoff.toFixed(2)} ريال\nشكراً لالتزامكم.`);

      res.json({ ok: true, contract: result.updated, request: result.done });
    } catch (e) { next(e); }
  },
);

// --------- Admin rejects ---------
financingClosureRouter.post(
  "/admin/early-settlement/:requestId/reject",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const body = z.object({ adminNote: z.string().min(3).max(1000) }).parse(req.body ?? {});
      const request = await prisma.financingEarlySettlement.findUnique({ where: { id: req.params.requestId } });
      if (!request) return res.status(404).json({ error: "request_not_found" });
      if (request.status !== "REQUESTED") return res.status(400).json({ error: "invalid_status" });
      const updated = await prisma.financingEarlySettlement.update({
        where: { id: request.id },
        data: { status: "REJECTED", adminNote: body.adminNote, approvedById: req.user!.id, approvedAt: new Date() },
      });
      const c = await prisma.financingContract.findUnique({ where: { id: request.contractId } });
      if (c) await WA.notify(c.applicantId, `⚠️ تم رفض طلب السداد المبكر للعقد ${c.code}.\nالسبب: ${body.adminNote}`);
      res.json({ request: updated });
    } catch (e) { next(e); }
  },
);

// --------- List early settlement requests (client sees own; staff sees all) ---------
financingClosureRouter.get("/contracts/:id/early-settlement", async (req, res, next) => {
  try {
    const contract = await prisma.financingContract.findUnique({ where: { id: req.params.id } });
    if (!contract) return res.status(404).json({ error: "not_found" });
    if (!isStaff(req.user!.role) && contract.applicantId !== req.user!.id) return res.status(403).json({ error: "forbidden" });
    const requests = await prisma.financingEarlySettlement.findMany({
      where: { contractId: contract.id }, orderBy: { createdAt: "desc" },
    });
    res.json({ requests });
  } catch (e) { next(e); }
});

// ==================================================================================
// RISK ACTIONS (admin only)
// ==================================================================================
financingClosureRouter.post(
  "/admin/contracts/:id/risk-action",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const body = z.object({
        type: z.enum(["WATCHLIST", "RESTRUCTURE", "RESCHEDULE", "WRITE_OFF", "RECOVERY_NOTE"]),
        reasonAr: z.string().min(3).max(2000),
        detailsJson: z.record(z.string(), z.unknown()).optional(),
      }).parse(req.body);

      const contract = await prisma.financingContract.findUnique({ where: { id: req.params.id } });
      if (!contract) return res.status(404).json({ error: "not_found" });

      const action = await prisma.financingRiskAction.create({
        data: {
          contractId: contract.id,
          type: body.type,
          reasonAr: body.reasonAr,
          detailsJson: (body.detailsJson ?? {}) as Prisma.InputJsonValue,
          createdById: req.user!.id,
        },
      });

      // Status transitions for terminal actions
      let statusUpdate: { status: "RESTRUCTURED" | "WRITTEN_OFF" } | null = null;
      if (body.type === "WRITE_OFF") statusUpdate = { status: "WRITTEN_OFF" };
      if (body.type === "RESTRUCTURE") statusUpdate = { status: "RESTRUCTURED" };
      if (statusUpdate) {
        await prisma.financingContract.update({ where: { id: contract.id }, data: statusUpdate });
        await prisma.financingInstallment.updateMany({
          where: { contractId: contract.id, status: { in: ["PENDING", "OVERDUE"] } },
          data: { status: "WAIVED", note: `تم ${body.type === "WRITE_OFF" ? "شطب" : "إعادة هيكلة"} العقد` },
        });
      }

      await logAudit(req, "financing.risk_action", "FinancingContract", contract.id, { type: body.type });
      await WA.notify(contract.applicantId, `🔔 تحديث على عقدكم ${contract.code}: ${
        { WATCHLIST: "وُضع تحت المراقبة", RESTRUCTURE: "إعادة هيكلة", RESCHEDULE: "إعادة جدولة", WRITE_OFF: "شُطب رسمياً", RECOVERY_NOTE: "ملاحظة تحصيل" }[body.type]
      }`);
      res.json({ action });
    } catch (e) { next(e); }
  },
);

financingClosureRouter.get(
  "/admin/contracts/:id/risk-actions",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const actions = await prisma.financingRiskAction.findMany({
        where: { contractId: req.params.id },
        orderBy: { createdAt: "desc" },
      });
      res.json({ actions });
    } catch (e) { next(e); }
  },
);

// ==================================================================================
// DISCLOSURES — public read + admin CRUD
// ==================================================================================
export const financingDisclosuresPublicRouter = Router();

financingDisclosuresPublicRouter.get("/disclosures", async (_req, res, next) => {
  try {
    const list = await prisma.financingDisclosure.findMany({
      where: { isPublished: true },
      orderBy: [{ order: "asc" }, { publishedAt: "desc" }],
      select: {
        id: true, slug: true, titleAr: true, category: true, summaryAr: true,
        effectiveAt: true, publishedAt: true, documentPath: true, order: true,
      },
    });
    res.json({ disclosures: list });
  } catch (e) { next(e); }
});

financingDisclosuresPublicRouter.get("/disclosures/:slug", async (req, res, next) => {
  try {
    const item = await prisma.financingDisclosure.findFirst({
      where: { slug: req.params.slug, isPublished: true },
    });
    if (!item) return res.status(404).json({ error: "not_found" });
    res.json({ disclosure: item });
  } catch (e) { next(e); }
});

financingClosureRouter.get(
  "/admin/disclosures",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (_req, res, next) => {
    try {
      const list = await prisma.financingDisclosure.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
      res.json({ disclosures: list });
    } catch (e) { next(e); }
  },
);

const disclosureBody = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  titleAr: z.string().min(3).max(240),
  category: z.enum(["RATE_SHEET", "TERMS", "COMPLAINTS", "GOVERNANCE", "SAMA_NOTICE", "REPORT"]),
  summaryAr: z.string().max(600).optional().nullable(),
  bodyAr: z.string().min(5),
  documentPath: z.string().max(400).optional().nullable(),
  effectiveAt: z.string().datetime().optional().nullable(),
  isPublished: z.boolean().optional(),
  order: z.number().int().optional(),
});

financingClosureRouter.post(
  "/admin/disclosures",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const body = disclosureBody.parse(req.body);
      const item = await prisma.financingDisclosure.create({
        data: {
          ...body,
          effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : null,
          publishedAt: body.isPublished ? new Date() : null,
          createdById: req.user!.id,
        },
      });
      await logAudit(req, "financing.disclosure.create", "FinancingDisclosure", item.id, { slug: item.slug });
      res.json({ disclosure: item });
    } catch (e) { next(e); }
  },
);

financingClosureRouter.patch(
  "/admin/disclosures/:id",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const body = disclosureBody.partial().parse(req.body);
      const current = await prisma.financingDisclosure.findUnique({ where: { id: req.params.id } });
      if (!current) return res.status(404).json({ error: "not_found" });
      const willPublish = body.isPublished === true && !current.isPublished;
      const item = await prisma.financingDisclosure.update({
        where: { id: req.params.id },
        data: {
          ...body,
          effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : body.effectiveAt === null ? null : undefined,
          publishedAt: willPublish ? new Date() : body.isPublished === false ? null : undefined,
        },
      });
      await logAudit(req, "financing.disclosure.update", "FinancingDisclosure", item.id, {});
      res.json({ disclosure: item });
    } catch (e) { next(e); }
  },
);

financingClosureRouter.delete(
  "/admin/disclosures/:id",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      await prisma.financingDisclosure.delete({ where: { id: req.params.id } });
      await logAudit(req, "financing.disclosure.delete", "FinancingDisclosure", req.params.id, {});
      res.json({ ok: true });
    } catch (e) { next(e); }
  },
);
