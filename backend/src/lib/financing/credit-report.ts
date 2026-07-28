// Internal Credit Report Engine — ASH proprietary (SIMAH-like structure)
// Deterministic scoring based on applicant-entered data. Not a final decision;
// admin analysts audit and can override via the review workflow.
import type { FinancingApplication } from "@prisma/client";

export type CreditFactor = {
  code: string;
  labelAr: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;         // absolute point contribution
  detailAr?: string;
};

export type CreditGrade = "A+" | "A" | "B" | "C" | "D" | "E";

export type InternalCreditReport = {
  version: string;                 // report schema version
  generatedAt: string;
  score: number;                   // 300..850 (SIMAH-like scale)
  grade: CreditGrade;
  riskLevel: "منخفض جداً" | "منخفض" | "متوسط" | "مرتفع" | "مرتفع جداً";
  recommendationAr: string;
  dtiPct: number;                  // Debt-to-Income
  dsrPct: number;                  // Debt Service Ratio incl. new installment
  affordability: {
    monthlyIncome: number;
    monthlyObligations: number;
    proposedInstallment: number;
    disposableAfter: number;
    installmentToIncomePct: number;
  };
  amountRequested: number;
  termMonths: number;
  maxRecommendedAmount: number;
  factors: CreditFactor[];
  flags: string[];                 // e.g. "high_dti", "insufficient_income"
  auditRequired: boolean;          // must be reviewed manually before approval
  disclosureAr: string;
};

type Input = Pick<
  FinancingApplication,
  | "amount" | "termMonths" | "monthlyIncome" | "monthlyObligations"
  | "yearsOfService" | "employmentType" | "employer" | "annualRevenue"
  | "businessName" | "nationalId"
>;

const num = (v: unknown): number => {
  if (v == null) return 0;
  const n = Number((v as { toString?: () => string })?.toString?.() ?? v);
  return isFinite(n) ? n : 0;
};

function gradeFor(score: number): { grade: CreditGrade; risk: InternalCreditReport["riskLevel"] } {
  if (score >= 780) return { grade: "A+", risk: "منخفض جداً" };
  if (score >= 720) return { grade: "A", risk: "منخفض" };
  if (score >= 650) return { grade: "B", risk: "متوسط" };
  if (score >= 580) return { grade: "C", risk: "مرتفع" };
  if (score >= 500) return { grade: "D", risk: "مرتفع جداً" };
  return { grade: "E", risk: "مرتفع جداً" };
}

export function computeInternalCreditReport(input: Input): InternalCreditReport {
  const amount = num(input.amount);
  const term = Math.max(1, input.termMonths || 12);
  const income = num(input.monthlyIncome);
  const oblig = num(input.monthlyObligations);
  const years = Math.min(20, Math.max(0, num(input.yearsOfService)));
  const installment = amount / term;

  const dti = income > 0 ? oblig / income : 1;
  const dsr = income > 0 ? (oblig + installment) / income : 1;
  const iti = income > 0 ? installment / income : 1;

  const factors: CreditFactor[] = [];
  const flags: string[] = [];
  let score = 600; // baseline

  // ---- Income
  if (income >= 25000) { score += 80; factors.push({ code: "income_high", labelAr: "دخل شهري مرتفع", impact: "positive", weight: 80, detailAr: `${income.toLocaleString("ar-SA")} ﷼` }); }
  else if (income >= 15000) { score += 55; factors.push({ code: "income_upper", labelAr: "دخل شهري جيد", impact: "positive", weight: 55 }); }
  else if (income >= 8000) { score += 30; factors.push({ code: "income_mid", labelAr: "دخل شهري متوسط", impact: "positive", weight: 30 }); }
  else if (income >= 4000) { score += 5; factors.push({ code: "income_low", labelAr: "دخل شهري محدود", impact: "neutral", weight: 5 }); }
  else { score -= 60; flags.push("insufficient_income"); factors.push({ code: "income_insufficient", labelAr: "دخل غير كافٍ", impact: "negative", weight: 60 }); }

  // ---- DTI (existing obligations vs income)
  if (dti <= 0.15) { score += 60; factors.push({ code: "dti_excellent", labelAr: "التزامات قائمة منخفضة", impact: "positive", weight: 60, detailAr: `${(dti * 100).toFixed(1)}٪` }); }
  else if (dti <= 0.30) { score += 30; factors.push({ code: "dti_good", labelAr: "التزامات متوازنة", impact: "positive", weight: 30, detailAr: `${(dti * 100).toFixed(1)}٪` }); }
  else if (dti <= 0.45) { score -= 10; factors.push({ code: "dti_high", labelAr: "التزامات مرتفعة", impact: "negative", weight: 10, detailAr: `${(dti * 100).toFixed(1)}٪` }); }
  else { score -= 70; flags.push("high_dti"); factors.push({ code: "dti_critical", labelAr: "التزامات حرجة", impact: "negative", weight: 70, detailAr: `${(dti * 100).toFixed(1)}٪` }); }

  // ---- DSR (with proposed installment) — SAMA guideline: ≤ 45%
  if (dsr <= 0.35) { score += 55; factors.push({ code: "dsr_healthy", labelAr: "قدرة سداد صحية", impact: "positive", weight: 55, detailAr: `${(dsr * 100).toFixed(1)}٪` }); }
  else if (dsr <= 0.45) { score += 15; factors.push({ code: "dsr_ok", labelAr: "قدرة سداد مقبولة", impact: "neutral", weight: 15, detailAr: `${(dsr * 100).toFixed(1)}٪` }); }
  else if (dsr <= 0.65) { score -= 55; flags.push("dsr_exceeds_guideline"); factors.push({ code: "dsr_stretch", labelAr: "قدرة سداد تحت الضغط", impact: "negative", weight: 55, detailAr: `${(dsr * 100).toFixed(1)}٪` }); }
  else { score -= 120; flags.push("dsr_unsustainable"); factors.push({ code: "dsr_unsustainable", labelAr: "قدرة سداد غير مستدامة", impact: "negative", weight: 120, detailAr: `${(dsr * 100).toFixed(1)}٪` }); }

  // ---- Employment tenure
  if (years >= 5) { score += 45; factors.push({ code: "tenure_stable", labelAr: `استقرار وظيفي (${years} سنة)`, impact: "positive", weight: 45 }); }
  else if (years >= 2) { score += 20; factors.push({ code: "tenure_moderate", labelAr: `مدة عمل معقولة (${years} سنة)`, impact: "positive", weight: 20 }); }
  else if (years >= 1) { score += 5; factors.push({ code: "tenure_short", labelAr: "مدة عمل قصيرة", impact: "neutral", weight: 5 }); }
  else { score -= 25; factors.push({ code: "tenure_none", labelAr: "لا يوجد استقرار وظيفي مثبت", impact: "negative", weight: 25 }); }

  // ---- Employment type
  const et = (input.employmentType || "").toUpperCase();
  if (et === "GOVERNMENT" || et === "MILITARY") { score += 40; factors.push({ code: "employer_gov", labelAr: "قطاع حكومي/عسكري", impact: "positive", weight: 40 }); }
  else if (et === "PRIVATE") { score += 15; factors.push({ code: "employer_priv", labelAr: "قطاع خاص", impact: "positive", weight: 15 }); }
  else if (et === "SELF_EMPLOYED" || et === "FREELANCE") { score -= 15; factors.push({ code: "employer_self", labelAr: "عمل حر", impact: "negative", weight: 15 }); }
  else if (input.businessName) {
    const rev = num(input.annualRevenue);
    if (rev >= 5_000_000) { score += 50; factors.push({ code: "biz_strong", labelAr: "منشأة بإيرادات قوية", impact: "positive", weight: 50 }); }
    else if (rev >= 500_000) { score += 20; factors.push({ code: "biz_ok", labelAr: "منشأة بإيرادات مقبولة", impact: "positive", weight: 20 }); }
    else { score -= 10; factors.push({ code: "biz_small", labelAr: "منشأة صغيرة", impact: "neutral", weight: 10 }); }
  }

  // ---- Installment-to-Income
  if (iti > 0.5) { score -= 40; flags.push("iti_high"); factors.push({ code: "iti_high", labelAr: "القسط يستهلك نصف الدخل", impact: "negative", weight: 40 }); }

  // ---- Requested amount plausibility
  const maxRecommended = Math.max(0, Math.round((income * 0.35 - oblig) * term));
  if (amount > maxRecommended && maxRecommended > 0) {
    score -= 30;
    flags.push("amount_exceeds_capacity");
    factors.push({
      code: "amount_over_cap",
      labelAr: "المبلغ يتجاوز القدرة المحسوبة",
      impact: "negative",
      weight: 30,
      detailAr: `الحد الموصى به ≈ ${maxRecommended.toLocaleString("ar-SA")} ﷼`,
    });
  }

  // ---- KYC completeness
  if (!input.nationalId) { score -= 30; flags.push("missing_national_id"); }

  // Clamp to SIMAH-like 300..850
  const scaled = Math.max(300, Math.min(850, score));
  const { grade, risk } = gradeFor(scaled);

  const disposable = Math.max(0, income - oblig - installment);
  const auditRequired = flags.length > 0 || scaled < 650;

  const recommendationAr =
    scaled >= 720 ? "مؤهل بشكل مبدئي — يُوصى بإكمال المراجعة الائتمانية والاعتماد."
    : scaled >= 650 ? "مؤهل مع تحفظ — يُطلب توثيق إضافي للدخل والالتزامات."
    : scaled >= 580 ? "مخاطر متوسطة — يوصى بمراجعة اللجنة الائتمانية قبل الاعتماد."
    : "مخاطر مرتفعة — يوصى بالرفض أو خفض المبلغ أو تمديد المدة.";

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    score: scaled,
    grade,
    riskLevel: risk,
    recommendationAr,
    dtiPct: Math.round(dti * 10000) / 100,
    dsrPct: Math.round(dsr * 10000) / 100,
    affordability: {
      monthlyIncome: Math.round(income),
      monthlyObligations: Math.round(oblig),
      proposedInstallment: Math.round(installment),
      disposableAfter: Math.round(disposable),
      installmentToIncomePct: Math.round(iti * 10000) / 100,
    },
    amountRequested: Math.round(amount),
    termMonths: term,
    maxRecommendedAmount: maxRecommended,
    factors,
    flags,
    auditRequired,
    disclosureAr:
      "هذا التقرير الائتماني الداخلي مبني على البيانات التي أدخلها المتقدم ويهدف إلى دعم قرار الاعتماد. " +
      "لا يُعدّ قراراً نهائياً، ويتم تدقيقه لاحقاً من قِبل محلل ائتماني ولجنة الائتمان قبل الاعتماد.",
  };
}
