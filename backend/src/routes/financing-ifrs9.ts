// Phase 8 — IFRS 9 Expected Credit Loss (ECL) & Stress Testing
// SAMA-aligned staging (Stage 1 / 2 / 3), PD × LGD × EAD, and scenario stress.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { FINANCING_READ_ROLES, logFinancingAudit } from "../middleware/financing.js";

export const financingIfrs9Router = Router();
financingIfrs9Router.use(requireAuth);

// ---------- helpers ----------
const toNum = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(typeof v === "string" ? v : (v as { toString(): string }).toString());
  return isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400_000);

const NEGATIVE_TERMINAL = ["DEFAULTED", "WRITTEN_OFF"] as const;
const TERMINAL_STATUSES = ["COMPLETED", "DEFAULTED", "EARLY_SETTLED", "RESTRUCTURED", "WRITTEN_OFF"] as const;
const LIVE_STATUSES = ["ACTIVE", "SIGNED", "AWAITING_CLIENT_SIGNATURE", "RESTRUCTURED"] as const;

// Basel/SAMA defaults when historical data is thin.
const DEFAULT_LGD = 0.45;          // 45% loss given default (senior unsecured retail)
const FLOOR_PD_S1 = 0.005;         // 0.5% minimum 12-month PD
const FLOOR_PD_S2 = 0.08;          // 8% lifetime PD floor for SICR
const FLOOR_PD_S3 = 1.0;           // 100% for credit-impaired

type StageKey = "stage1" | "stage2" | "stage3";
type StageBucket = {
  key: StageKey;
  label: string;
  labelAr: string;
  count: number;
  ead: number;      // Exposure at Default (outstanding principal)
  pd: number;       // 0..1
  lgd: number;      // 0..1
  ecl: number;      // EAD × PD × LGD
  coveragePct: number; // ecl / ead
};

// ============================================================
// Core ECL calculator (shared by /ecl and /stress-test)
// ============================================================
async function computeEcl(opts: {
  pdMultiplier?: number;   // default 1
  lgdMultiplier?: number;  // default 1
  macroShockPct?: number;  // e.g. +0.20 shifts 20% of Stage 1 into Stage 2
} = {}) {
  const pdMul = Math.max(0, opts.pdMultiplier ?? 1);
  const lgdMul = Math.max(0, opts.lgdMultiplier ?? 1);
  const shock = Math.max(0, Math.min(1, opts.macroShockPct ?? 0));

  const today = startOfDay();

  const contracts = await prisma.financingContract.findMany({
    select: {
      id: true, code: true, status: true, financedAmount: true,
      installments: { select: { status: true, dueDate: true, principal: true, paidAmount: true, interest: true } },
    },
  });

  // ---- Historical PD (12-month cohort proxy) and LGD from write-offs
  const terminated = contracts.filter((c) => (TERMINAL_STATUSES as readonly string[]).includes(c.status));
  const defaulted = contracts.filter((c) => (NEGATIVE_TERMINAL as readonly string[]).includes(c.status));
  const histPd12m = terminated.length ? defaulted.length / terminated.length : FLOOR_PD_S1;
  const pd12m = Math.max(FLOOR_PD_S1, histPd12m);
  const pdLifetime = Math.max(FLOOR_PD_S2, Math.min(1, pd12m * 3)); // ~3x scaling proxy

  const writtenOff = contracts.filter((c) => c.status === "WRITTEN_OFF");
  let lgdLoss = 0, lgdExp = 0;
  for (const c of writtenOff) {
    const financed = toNum(c.financedAmount);
    let collected = 0;
    for (const i of c.installments) if (i.status === "PAID") collected += toNum(i.paidAmount) || toNum(i.principal);
    lgdLoss += Math.max(0, financed - collected);
    lgdExp += financed;
  }
  const histLgd = lgdExp > 0 ? lgdLoss / lgdExp : DEFAULT_LGD;
  const lgd = Math.max(0.05, Math.min(1, histLgd));

  // ---- Stage each live contract by max DPD & restructured flag
  const stages: Record<StageKey, StageBucket> = {
    stage1: { key: "stage1", label: "Stage 1", labelAr: "المرحلة 1 — أداء منتظم", count: 0, ead: 0, pd: 0, lgd: 0, ecl: 0, coveragePct: 0 },
    stage2: { key: "stage2", label: "Stage 2", labelAr: "المرحلة 2 — ارتفاع ملحوظ في المخاطر", count: 0, ead: 0, pd: 0, lgd: 0, ecl: 0, coveragePct: 0 },
    stage3: { key: "stage3", label: "Stage 3", labelAr: "المرحلة 3 — ائتمان متعثر", count: 0, ead: 0, pd: 0, lgd: 0, ecl: 0, coveragePct: 0 },
  };

  const perContract: {
    code: string; status: string; stage: StageKey; ead: number; pd: number; lgd: number; ecl: number; dpd: number;
  }[] = [];

  for (const c of contracts) {
    const isLive = (LIVE_STATUSES as readonly string[]).includes(c.status);
    const isBad = (NEGATIVE_TERMINAL as readonly string[]).includes(c.status);
    if (!isLive && !isBad) continue;

    let outstanding = 0, dpd = 0, accruedInterest = 0;
    for (const i of c.installments) {
      if (i.status === "PENDING" || i.status === "OVERDUE") {
        outstanding += toNum(i.principal);
        accruedInterest += toNum(i.interest);
        const d = Math.max(0, daysBetween(today, startOfDay(i.dueDate)));
        if (d > dpd) dpd = d;
      }
    }
    // For bad-status contracts with no remaining schedule, fall back to financed.
    const eadBase = outstanding > 0 ? outstanding : (isBad ? toNum(c.financedAmount) : 0);
    if (eadBase <= 0) continue;

    let stage: StageKey;
    if (isBad || dpd > 90) stage = "stage3";
    else if (dpd > 30 || c.restructured) stage = "stage2";
    else stage = "stage1";

    // Apply macro shock: migrate a portion of Stage 1 into Stage 2.
    const applyShock = stage === "stage1" && shock > 0;
    const shockedEad = applyShock ? eadBase * shock : 0;
    const remainingEad = eadBase - shockedEad;

    const pushBucket = (b: StageBucket, ead: number, basePd: number) => {
      const pd = Math.max(0, Math.min(1, basePd * pdMul));
      const l = Math.max(0, Math.min(1, lgd * lgdMul));
      const eclVal = stage === "stage3"
        ? ead * l + accruedInterest * l   // include accrued interest for impaired
        : ead * pd * l;
      b.count += 1;
      b.ead = round2(b.ead + ead);
      b.pd = pd;
      b.lgd = l;
      b.ecl = round2(b.ecl + eclVal);
      perContract.push({
        code: c.code, status: c.status, stage: b.key,
        ead: round2(ead), pd: round4(pd), lgd: round4(l), ecl: round2(eclVal), dpd,
      });
    };

    if (stage === "stage1") {
      if (remainingEad > 0) pushBucket(stages.stage1, remainingEad, pd12m);
      if (shockedEad > 0) pushBucket(stages.stage2, shockedEad, pdLifetime);
    } else if (stage === "stage2") {
      pushBucket(stages.stage2, eadBase, pdLifetime);
    } else {
      pushBucket(stages.stage3, eadBase, FLOOR_PD_S3);
    }
  }

  for (const k of ["stage1", "stage2", "stage3"] as const) {
    const b = stages[k];
    b.coveragePct = b.ead > 0 ? round4(b.ecl / b.ead) : 0;
  }

  const totalEad = round2(stages.stage1.ead + stages.stage2.ead + stages.stage3.ead);
  const totalEcl = round2(stages.stage1.ecl + stages.stage2.ecl + stages.stage3.ecl);
  const totalCoveragePct = totalEad > 0 ? round4(totalEcl / totalEad) : 0;

  return {
    inputs: { pdMultiplier: pdMul, lgdMultiplier: lgdMul, macroShockPct: shock },
    parameters: {
      pd12mBase: round4(pd12m),
      pdLifetimeBase: round4(pdLifetime),
      lgdBase: round4(lgd),
      historicalDefaults: defaulted.length,
      historicalTerminated: terminated.length,
      writtenOffContracts: writtenOff.length,
    },
    stages: Object.values(stages),
    totals: { ead: totalEad, ecl: totalEcl, coveragePct: totalCoveragePct },
    perContract,
  };
}

// ============================================================
// GET /ecl — baseline IFRS 9 ECL snapshot
// ============================================================
financingIfrs9Router.get(
  "/ecl",
  requireRole(...(FINANCING_READ_ROLES as unknown as [string, ...string[]])),
  async (req, res) => {
    const data = await computeEcl();
    await logFinancingAudit(req, "ifrs9.ecl.view", "FinancingIFRS9", "baseline");
    res.json({ generatedAt: new Date().toISOString(), ...data });
  },
);

// ============================================================
// GET /stress-scenarios — predefined SAMA-style scenarios
// ============================================================
const SCENARIOS = [
  { id: "baseline", nameAr: "السيناريو الأساسي", pdMultiplier: 1.0, lgdMultiplier: 1.0, macroShockPct: 0.0,
    descriptionAr: "نمو اقتصادي مستقر، تضخم منخفض، عدم تعثر متوقع." },
  { id: "adverse", nameAr: "السيناريو السلبي المعتدل", pdMultiplier: 1.75, lgdMultiplier: 1.25, macroShockPct: 0.15,
    descriptionAr: "تباطؤ نمو، ارتفاع بطالة 2%، انخفاض ثقة المستهلك." },
  { id: "severe", nameAr: "السيناريو الحاد", pdMultiplier: 3.0, lgdMultiplier: 1.5, macroShockPct: 0.30,
    descriptionAr: "ركود عميق، تراجع GDP 3%+، صدمة سيولة مطولة." },
  { id: "extreme", nameAr: "الإجهاد الشديد (Reverse Stress)", pdMultiplier: 5.0, lgdMultiplier: 1.75, macroShockPct: 0.5,
    descriptionAr: "اختبار حد الانهيار — يحدد رأس المال اللازم للنجاة." },
] as const;

financingIfrs9Router.get(
  "/stress-scenarios",
  requireRole(...(FINANCING_READ_ROLES as unknown as [string, ...string[]])),
  async (_req, res) => {
    res.json({ scenarios: SCENARIOS });
  },
);

// ============================================================
// POST /stress-test — run one or more scenarios and compare to baseline
// ============================================================
const stressBody = z.object({
  scenarios: z.array(z.object({
    id: z.string().min(1),
    nameAr: z.string().optional(),
    pdMultiplier: z.number().min(0).max(20),
    lgdMultiplier: z.number().min(0).max(5),
    macroShockPct: z.number().min(0).max(1),
  })).min(1).max(8),
});

financingIfrs9Router.post(
  "/stress-test",
  requireRole(...(FINANCING_READ_ROLES as unknown as [string, ...string[]])),
  async (req, res) => {
    const body = stressBody.parse(req.body ?? {});
    const baseline = await computeEcl();
    const results = [];
    for (const s of body.scenarios) {
      const r = await computeEcl({
        pdMultiplier: s.pdMultiplier,
        lgdMultiplier: s.lgdMultiplier,
        macroShockPct: s.macroShockPct,
      });
      const deltaEcl = round2(r.totals.ecl - baseline.totals.ecl);
      const deltaPct = baseline.totals.ecl > 0 ? round4(deltaEcl / baseline.totals.ecl) : 0;
      results.push({
        id: s.id,
        nameAr: s.nameAr || s.id,
        inputs: r.inputs,
        stages: r.stages.map((b) => ({ key: b.key, labelAr: b.labelAr, ead: b.ead, ecl: b.ecl, coveragePct: b.coveragePct, count: b.count })),
        totals: r.totals,
        deltaVsBaseline: { ecl: deltaEcl, pct: deltaPct },
      });
    }
    await logFinancingAudit(req, "ifrs9.stress.run", "FinancingIFRS9", "stress", { scenarios: body.scenarios.length });
    res.json({
      generatedAt: new Date().toISOString(),
      baseline: {
        parameters: baseline.parameters,
        stages: baseline.stages.map((b) => ({ key: b.key, labelAr: b.labelAr, ead: b.ead, ecl: b.ecl, coveragePct: b.coveragePct, count: b.count })),
        totals: baseline.totals,
      },
      results,
    });
  },
);
