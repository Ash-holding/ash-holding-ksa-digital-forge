import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";

export type CreditReport = {
  version: string;
  generatedAt: string;
  score: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "E";
  riskLevel: string;
  recommendationAr: string;
  dtiPct: number;
  dsrPct: number;
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
  factors: Array<{ code: string; labelAr: string; impact: "positive" | "negative" | "neutral"; weight: number; detailAr?: string }>;
  flags: string[];
  auditRequired: boolean;
  disclosureAr: string;
};

const gradeColor: Record<string, string> = {
  "A+": "from-emerald-500 to-teal-500",
  A: "from-emerald-500 to-lime-500",
  B: "from-blue-500 to-cyan-500",
  C: "from-amber-500 to-orange-500",
  D: "from-orange-500 to-rose-500",
  E: "from-rose-600 to-red-700",
};

const fmt = (n: number) => new Intl.NumberFormat("ar-SA").format(Math.round(n));

export function InternalCreditReportPanel({ report }: { report: CreditReport }) {
  const pct = Math.max(0, Math.min(100, ((report.score - 300) / 550) * 100));

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl" dir="rtl">
      <div className="flex items-center gap-2 text-sm font-bold text-electric">
        <ShieldCheck className="h-4 w-4" />
        التقرير الائتماني الداخلي — ASH Credit Bureau
        <span className="ms-auto text-[11px] font-medium text-slate-400">
          {new Date(report.generatedAt).toLocaleString("ar-SA")}
        </span>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`relative aspect-square rounded-3xl bg-gradient-to-br ${gradeColor[report.grade]} p-1`}
        >
          <div className="h-full w-full rounded-[calc(1.5rem-4px)] bg-slate-950 flex flex-col items-center justify-center">
            <div className="text-[11px] font-semibold text-slate-300 tracking-[0.2em]">SCORE / 850</div>
            <div className="mt-1 text-6xl font-black tabular-nums text-white leading-none">{report.score}</div>
            <div className="mt-2 text-sm font-bold text-white">{report.grade} • <span className="text-white/90">{report.riskLevel}</span></div>
            <div className="mt-3 w-3/4 h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </motion.div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Metric label="نسبة الالتزامات (DTI)" value={`${report.dtiPct}%`} tone={report.dtiPct > 30 ? "warn" : "ok"} />
            <Metric label="قدرة السداد (DSR)" value={`${report.dsrPct}%`} tone={report.dsrPct > 45 ? "bad" : "ok"} />
            <Metric label="القسط / الدخل" value={`${report.affordability.installmentToIncomePct}%`} tone={report.affordability.installmentToIncomePct > 50 ? "bad" : "ok"} />
            <Metric label="السيولة المتبقية" value={`${fmt(report.affordability.disposableAfter)} ﷼`} tone="ok" />
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 text-sm leading-7">
            <div className="text-white font-bold mb-1 text-base">توصية النظام</div>
            <div className="text-slate-200">{report.recommendationAr}</div>
            {report.maxRecommendedAmount > 0 && report.maxRecommendedAmount < report.amountRequested && (
              <div className="mt-2 text-amber-300 font-semibold">
                ⚠️ الحد الموصى به لهذا المتقدم: <b className="text-amber-200">{fmt(report.maxRecommendedAmount)} ﷼</b> — المطلوب {fmt(report.amountRequested)} ﷼
              </div>
            )}
          </div>
          {report.auditRequired && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              يتطلب هذا الملف تدقيقاً بشرياً من لجنة الائتمان قبل الاعتماد النهائي.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-sm font-bold text-white mb-2">العوامل المؤثرة في التقييم</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {report.factors.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2.5 text-sm">
              {f.impact === "positive" ? (
                <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : f.impact === "negative" ? (
                <TrendingDown className="h-4 w-4 text-rose-400 shrink-0" />
              ) : (
                <Info className="h-4 w-4 text-slate-300 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold truncate">{f.labelAr}</div>
                {f.detailAr && <div className="text-[11px] text-slate-400 truncate">{f.detailAr}</div>}
              </div>
              <div className={`text-xs font-black tabular-nums ${
                f.impact === "positive" ? "text-emerald-300" : f.impact === "negative" ? "text-rose-300" : "text-slate-200"
              }`}>
                {f.impact === "positive" ? "+" : f.impact === "negative" ? "−" : "±"}{f.weight}
              </div>
            </div>
          ))}
        </div>
      </div>

      {report.flags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {report.flags.map((flag) => (
            <span key={flag} className="text-[11px] px-2 py-1 rounded-full bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30 font-mono font-semibold">
              {flag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 text-xs leading-7 text-slate-300 border-t border-white/10 pt-3">
        {report.disclosureAr}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" }) {
  const color =
    tone === "bad" ? "text-rose-100 border-rose-400/40 bg-rose-500/15" :
    tone === "warn" ? "text-amber-100 border-amber-400/40 bg-amber-500/15" :
    "text-emerald-100 border-emerald-400/40 bg-emerald-500/15";
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${color}`}>
      <div className="text-[11px] font-semibold text-slate-300">{label}</div>
      <div className="text-base font-black tabular-nums mt-1">{value}</div>
    </div>
  );
}
