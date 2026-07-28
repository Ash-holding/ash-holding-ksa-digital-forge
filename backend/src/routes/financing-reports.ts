// Phase 7 — Financing Regulatory Reports & Analytics (SAMA-style)
// Portfolio KPIs, PAR aging, PD/LGD, monthly series, CSV export.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { FINANCING_READ_ROLES, logFinancingAudit } from "../middleware/financing.js";

export const financingReportsRouter = Router();
financingReportsRouter.use(requireAuth);

// ---------- helpers ----------
const toNum = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(typeof v === "string" ? v : (v as { toString(): string }).toString());
  return isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfMonth = (d = new Date()) => { const x = new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0, 0, 0, 0); return x; };
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400_000);

const ACTIVE_STATUSES = ["ACTIVE", "SIGNED", "AWAITING_CLIENT_SIGNATURE"] as const;
const TERMINAL_STATUSES = ["COMPLETED", "DEFAULTED", "EARLY_SETTLED", "RESTRUCTURED", "WRITTEN_OFF"] as const;
const NEGATIVE_TERMINAL = ["DEFAULTED", "WRITTEN_OFF"] as const;

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "string" ? v : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

// ============================================================
// GET /overview  — portfolio KPIs + status distribution + PAR + PD/LGD
// ============================================================
financingReportsRouter.get(
  "/overview",
  requireRole(...(FINANCING_READ_ROLES as unknown as [string, ...string[]])),
  async (req, res) => {
    const today = startOfDay();

    // 1) Contracts (all statuses) — light payload
    const contracts = await prisma.financingContract.findMany({
      select: {
        id: true, status: true, financedAmount: true, totalPayable: true,
        totalInterest: true, activatedAt: true, createdAt: true,
      },
    });

    // 2) Installments for portfolio calc
    const installments = await prisma.financingInstallment.findMany({
      select: {
        contractId: true, status: true, dueDate: true, principal: true,
        interest: true, total: true, paidAmount: true, paidAt: true, penaltyAmount: true,
      },
    });

    // ---- Status distribution & totals
    const statusDist: Record<string, { count: number; financed: number; payable: number }> = {};
    let grossFinanced = 0, grossPayable = 0, grossInterest = 0;
    for (const c of contracts) {
      const key = c.status;
      const s = (statusDist[key] ||= { count: 0, financed: 0, payable: 0 });
      s.count++;
      s.financed = round2(s.financed + toNum(c.financedAmount));
      s.payable = round2(s.payable + toNum(c.totalPayable));
      grossFinanced += toNum(c.financedAmount);
      grossPayable += toNum(c.totalPayable);
      grossInterest += toNum(c.totalInterest);
    }

    // ---- Outstanding & collections
    let outstandingPrincipal = 0, outstandingTotal = 0, collectedPrincipal = 0, collectedTotal = 0, penaltiesAccrued = 0;
    // For PAR bucketing per contract
    const contractMaxOverdueDays = new Map<string, number>();
    const contractOutstanding = new Map<string, number>();

    for (const i of installments) {
      const principal = toNum(i.principal);
      const total = toNum(i.total);
      if (i.status === "PAID") {
        collectedTotal += toNum(i.paidAmount) || total;
        collectedPrincipal += principal;
      } else if (i.status === "PENDING" || i.status === "OVERDUE") {
        outstandingPrincipal += principal;
        outstandingTotal += total;
        contractOutstanding.set(i.contractId, round2((contractOutstanding.get(i.contractId) || 0) + principal));
        const overdueDays = Math.max(0, daysBetween(today, startOfDay(i.dueDate)));
        const cur = contractMaxOverdueDays.get(i.contractId) || 0;
        if (overdueDays > cur) contractMaxOverdueDays.set(i.contractId, overdueDays);
      }
      penaltiesAccrued += toNum(i.penaltyAmount);
    }

    // ---- PAR aging by outstanding principal (active/signed contracts only)
    const activeIds = new Set(contracts.filter((c) => (ACTIVE_STATUSES as readonly string[]).includes(c.status)).map((c) => c.id));
    const aging = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
    let activeOutstanding = 0;
    for (const cid of activeIds) {
      const out = contractOutstanding.get(cid) || 0;
      activeOutstanding += out;
      const dpd = contractMaxOverdueDays.get(cid) || 0;
      if (dpd <= 0) aging.current += out;
      else if (dpd <= 30) aging.d1_30 += out;
      else if (dpd <= 60) aging.d31_60 += out;
      else if (dpd <= 90) aging.d61_90 += out;
      else aging.d90_plus += out;
    }
    (Object.keys(aging) as (keyof typeof aging)[]).forEach((k) => (aging[k] = round2(aging[k])));

    // NPL: 90+ overdue on active + defaulted/written-off principal-equivalent
    const nplBadContracts = contracts.filter((c) => (NEGATIVE_TERMINAL as readonly string[]).includes(c.status));
    const nplBadPrincipal = nplBadContracts.reduce((acc, c) => acc + toNum(c.financedAmount), 0);
    const nplExposure = aging.d90_plus + nplBadPrincipal;
    const nplDenom = activeOutstanding + nplBadPrincipal;
    const nplRatio = nplDenom > 0 ? round2((nplExposure / nplDenom) * 100) : 0;

    // ---- PD / LGD (historical)
    const terminated = contracts.filter((c) => (TERMINAL_STATUSES as readonly string[]).includes(c.status));
    const defaulted = contracts.filter((c) => (NEGATIVE_TERMINAL as readonly string[]).includes(c.status));
    const pdPct = terminated.length > 0 ? round2((defaulted.length / terminated.length) * 100) : 0;

    // LGD: for WRITTEN_OFF contracts, loss = financedAmount - collectedPrincipal_on_that_contract
    let lgdLossSum = 0, lgdExposureSum = 0;
    const writtenOffIds = contracts.filter((c) => c.status === "WRITTEN_OFF");
    if (writtenOffIds.length) {
      const woIds = new Set(writtenOffIds.map((c) => c.id));
      const collectedByContract = new Map<string, number>();
      for (const i of installments) {
        if (i.status === "PAID" && woIds.has(i.contractId)) {
          collectedByContract.set(i.contractId, (collectedByContract.get(i.contractId) || 0) + toNum(i.principal));
        }
      }
      for (const c of writtenOffIds) {
        const financed = toNum(c.financedAmount);
        const collected = collectedByContract.get(c.id) || 0;
        const loss = Math.max(0, financed - collected);
        lgdLossSum += loss;
        lgdExposureSum += financed;
      }
    }
    const lgdPct = lgdExposureSum > 0 ? round2((lgdLossSum / lgdExposureSum) * 100) : 0;

    // ---- Applications funnel (last 90 days)
    const since90 = addMonths(today, -3);
    const apps = await prisma.financingApplication.groupBy({
      by: ["stage"], _count: { _all: true }, where: { createdAt: { gte: since90 } },
    });
    const applicationsFunnel = apps.map((a) => ({ stage: a.stage, count: a._count._all }));

    await logFinancingAudit(req, "reports.overview.view", "FinancingReport", "overview");

    res.json({
      generatedAt: new Date().toISOString(),
      contractCount: contracts.length,
      activeContracts: activeIds.size,
      terminatedContracts: terminated.length,
      totals: {
        grossFinanced: round2(grossFinanced),
        grossPayable: round2(grossPayable),
        grossInterest: round2(grossInterest),
        outstandingPrincipal: round2(outstandingPrincipal),
        outstandingTotal: round2(outstandingTotal),
        collectedPrincipal: round2(collectedPrincipal),
        collectedTotal: round2(collectedTotal),
        penaltiesAccrued: round2(penaltiesAccrued),
      },
      statusDistribution: Object.entries(statusDist).map(([status, v]) => ({ status, ...v })),
      aging,
      activeOutstanding: round2(activeOutstanding),
      risk: {
        nplRatioPct: nplRatio,
        nplExposure: round2(nplExposure),
        pdPct,
        lgdPct,
        lgdLossSum: round2(lgdLossSum),
        lgdExposureSum: round2(lgdExposureSum),
        defaultedCount: defaulted.length,
        writtenOffCount: writtenOffIds.length,
      },
      applicationsFunnel,
    });
  },
);

// ============================================================
// GET /monthly?months=12 — disbursement & collection & new contracts per month
// ============================================================
const monthlyQuery = z.object({ months: z.coerce.number().int().min(3).max(36).default(12) });
financingReportsRouter.get(
  "/monthly",
  requireRole(...(FINANCING_READ_ROLES as unknown as [string, ...string[]])),
  async (req, res) => {
    const { months } = monthlyQuery.parse(req.query);
    const start = startOfMonth(addMonths(new Date(), -(months - 1)));

    const contracts = await prisma.financingContract.findMany({
      where: { OR: [{ activatedAt: { gte: start } }, { createdAt: { gte: start } }] },
      select: { activatedAt: true, createdAt: true, financedAmount: true, status: true },
    });
    const paid = await prisma.financingInstallment.findMany({
      where: { paidAt: { gte: start }, status: "PAID" },
      select: { paidAt: true, paidAmount: true, principal: true, interest: true },
    });

    // Build empty buckets
    const buckets: Record<string, { month: string; disbursed: number; collected: number; newContracts: number; principalCollected: number; interestCollected: number }> = {};
    for (let i = 0; i < months; i++) {
      const m = startOfMonth(addMonths(new Date(), -(months - 1 - i)));
      buckets[monthKey(m)] = { month: monthKey(m), disbursed: 0, collected: 0, newContracts: 0, principalCollected: 0, interestCollected: 0 };
    }
    for (const c of contracts) {
      if (c.activatedAt && c.activatedAt >= start) {
        const k = monthKey(c.activatedAt);
        if (buckets[k]) buckets[k].disbursed = round2(buckets[k].disbursed + toNum(c.financedAmount));
      }
      if (c.createdAt >= start) {
        const k = monthKey(c.createdAt);
        if (buckets[k]) buckets[k].newContracts++;
      }
    }
    for (const p of paid) {
      if (!p.paidAt) continue;
      const k = monthKey(p.paidAt);
      if (!buckets[k]) continue;
      buckets[k].collected = round2(buckets[k].collected + (toNum(p.paidAmount) || toNum(p.principal) + toNum(p.interest)));
      buckets[k].principalCollected = round2(buckets[k].principalCollected + toNum(p.principal));
      buckets[k].interestCollected = round2(buckets[k].interestCollected + toNum(p.interest));
    }

    res.json({ months, start: start.toISOString(), series: Object.values(buckets) });
  },
);

// ============================================================
// GET /exposure — per-contract snapshot for granular review
// ============================================================
financingReportsRouter.get(
  "/exposure",
  requireRole(...(FINANCING_READ_ROLES as unknown as [string, ...string[]])),
  async (_req, res) => {
    const contracts = await prisma.financingContract.findMany({
      select: {
        id: true, code: true, status: true, financedAmount: true, totalPayable: true,
        activatedAt: true, firstDueDate: true, lastDueDate: true, termMonths: true, ratePct: true,
        application: { select: { applicant: { select: { name: true } }, client: { select: { name: true } } } },
        installments: { select: { status: true, dueDate: true, principal: true, paidAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const today = startOfDay();
    const rows = contracts.map((c) => {
      let outstanding = 0, collected = 0, dpd = 0;
      for (const i of c.installments) {
        if (i.status === "PAID") collected += toNum(i.paidAmount) || toNum(i.principal);
        else if (i.status === "PENDING" || i.status === "OVERDUE") {
          outstanding += toNum(i.principal);
          const d = Math.max(0, daysBetween(today, startOfDay(i.dueDate)));
          if (d > dpd) dpd = d;
        }
      }
      const client = c.application?.client?.name || c.application?.applicant?.name || "—";
      return {
        contractCode: c.code,
        client,
        status: c.status,
        financedAmount: round2(toNum(c.financedAmount)),
        outstandingPrincipal: round2(outstanding),
        principalCollected: round2(collected),
        maxDpd: dpd,
        termMonths: c.termMonths,
        ratePct: toNum(c.ratePct),
        activatedAt: c.activatedAt?.toISOString() || null,
        firstDueDate: c.firstDueDate?.toISOString() || null,
        lastDueDate: c.lastDueDate?.toISOString() || null,
      };
    });
    res.json({ rows, count: rows.length });
  },
);

// ============================================================
// GET /export/:kind.csv — regulatory CSV exports
// ============================================================
financingReportsRouter.get(
  "/export/:kind.csv",
  requireRole(...(FINANCING_READ_ROLES as unknown as [string, ...string[]])),
  async (req, res) => {
    const kind = String(req.params.kind || "").toLowerCase();
    const send = (name: string, csv: string) => {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="ash-financing-${name}-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    };

    if (kind === "exposure") {
      const contracts = await prisma.financingContract.findMany({
        select: {
          code: true, status: true, financedAmount: true, totalPayable: true,
          activatedAt: true, firstDueDate: true, lastDueDate: true, termMonths: true, ratePct: true,
          application: { select: { applicant: { select: { name: true, phone: true } }, client: { select: { name: true } } } },
          installments: { select: { status: true, dueDate: true, principal: true, paidAmount: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      const today = startOfDay();
      const rows = contracts.map((c) => {
        let outstanding = 0, collected = 0, dpd = 0;
        for (const i of c.installments) {
          if (i.status === "PAID") collected += toNum(i.paidAmount) || toNum(i.principal);
          else if (i.status === "PENDING" || i.status === "OVERDUE") {
            outstanding += toNum(i.principal);
            const d = Math.max(0, daysBetween(today, startOfDay(i.dueDate)));
            if (d > dpd) dpd = d;
          }
        }
        return {
          contract_code: c.code,
          client: c.application?.client?.name || c.application?.applicant?.name || "",
          phone: c.application?.applicant?.phone || "",
          status: c.status,
          financed_amount: round2(toNum(c.financedAmount)),
          total_payable: round2(toNum(c.totalPayable)),
          outstanding_principal: round2(outstanding),
          principal_collected: round2(collected),
          max_dpd_days: dpd,
          term_months: c.termMonths,
          rate_pct: toNum(c.ratePct),
          activated_at: c.activatedAt?.toISOString() || "",
          first_due_date: c.firstDueDate?.toISOString().slice(0, 10) || "",
          last_due_date: c.lastDueDate?.toISOString().slice(0, 10) || "",
        };
      });
      await logFinancingAudit(req, "reports.export.exposure", "FinancingReport", "exposure", { rows: rows.length });
      return send("exposure", toCsv(rows));
    }

    if (kind === "installments") {
      const items = await prisma.financingInstallment.findMany({
        select: {
          n: true, dueDate: true, status: true, principal: true, interest: true, total: true,
          paidAt: true, paidAmount: true, penaltyAmount: true,
          contract: { select: { code: true, application: { select: { applicant: { select: { name: true } }, client: { select: { name: true } } } } } },
        },
        orderBy: [{ contractId: "asc" }, { n: "asc" }],
      });
      const rows = items.map((i) => ({
        contract_code: i.contract.code,
        client: i.contract.application?.client?.name || i.contract.application?.applicant?.name || "",
        installment_no: i.n,
        due_date: i.dueDate.toISOString().slice(0, 10),
        status: i.status,
        principal: round2(toNum(i.principal)),
        interest: round2(toNum(i.interest)),
        total: round2(toNum(i.total)),
        penalty: round2(toNum(i.penaltyAmount)),
        paid_at: i.paidAt?.toISOString().slice(0, 10) || "",
        paid_amount: round2(toNum(i.paidAmount)),
      }));
      await logFinancingAudit(req, "reports.export.installments", "FinancingReport", "installments", { rows: rows.length });
      return send("installments", toCsv(rows));
    }

    if (kind === "applications") {
      const apps = await prisma.financingApplication.findMany({
        select: {
          code: true, stage: true, requestedAmount: true, termMonths: true, createdAt: true, submittedAt: true, decidedAt: true,
          applicant: { select: { name: true, phone: true } }, client: { select: { name: true } },
          product: { select: { code: true, nameAr: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      const rows = apps.map((a) => ({
        code: a.code,
        stage: a.stage,
        applicant: a.applicant?.name || "",
        phone: a.applicant?.phone || "",
        client: a.client?.name || "",
        product_code: a.product?.code || "",
        product: a.product?.nameAr || "",
        requested_amount: round2(toNum(a.requestedAmount)),
        term_months: a.termMonths,
        created_at: a.createdAt.toISOString(),
        submitted_at: a.submittedAt?.toISOString() || "",
        decided_at: a.decidedAt?.toISOString() || "",
      }));
      await logFinancingAudit(req, "reports.export.applications", "FinancingReport", "applications", { rows: rows.length });
      return send("applications", toCsv(rows));
    }

    return res.status(400).json({ error: "unknown_export_kind", allowed: ["exposure", "installments", "applications"] });
  },
);
