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
  // Score wheel percentage (300..850 scale)
  const pct = Math.max(0, Math.min(100, ((report.score - 300) / 550) * 100));

  return (
    <div className="rounded-3xl border border-border bg-gradient-to-br from-slate-950/60 via-slate-900/40 to-slate-950/60 p-6 shadow-2xl">
      <div className="flex items-center gap-2 text-xs font-semibold text-electric">
        <ShieldCheck className="h-4 w-4" />
        التقرير الائتماني الداخلي — ASH Credit Bureau
        <span className="mr-auto text-[10px] text-muted-foreground">
          {new Date(report.generatedAt).toLocaleString("ar-SA")}
        </span>
      </div>

      {/* SCORE HERO */}
      <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`relative aspect-square rounded-3xl bg-gradient-to-br ${gradeColor[report.grade]} p-1`}
        >
          <div className="h-full w-full rounded-3xl bg-slate-950/80 flex flex-col items-center justify-center">
            <div className="text-[10px] text-slate-400 tracking-wider">SCORE / 850</div>
            <div className="text-5xl font-black tabular-nums text-white mt-1">{report.score}</div>
            <div className="mt-1 text-xs font-bold text-white/80">{report.grade} • {report.riskLevel}</div>
            <div className="mt-3 w-3/4 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-white/70" style={{ width: `${pct}%` }} />
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs leading-6">
            <div className="text-white font-semibold mb-1">توصية النظام</div>
            <div className="text-slate-300">{report.recommendationAr}</div>
            {report.maxRecommendedAmount > 0 && report.maxRecommendedAmount < report.amountRequested && (
              <div className="mt-2 text-amber-300">
                ⚠️ الحد الموصى به لهذا المتقدم: <b>{fmt(report.maxRecommendedAmount)} ﷼</b> — المطلوب {fmt(report.amountRequested)} ﷼
              </div>
            )}
          </div>
          {report.auditRequired && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              يتطلب هذا الملف تدقيقاً بشرياً من لجنة الائتمان قبل الاعتماد النهائي.
            </div>
          )}
        </div>
      </div>

      {/* FACTORS */}
      <div className="mt-6">
        <div className="text-xs font-semibold text-slate-300 mb-2">العوامل المؤثرة في التقييم</div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {report.factors.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
              {f.impact === "positive" ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : f.impact === "negative" ? (
                <TrendingDown className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              ) : (
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 truncate">{f.labelAr}</div>
                {f.detailAr && <div className="text-[10px] text-slate-400 truncate">{f.detailAr}</div>}
              </div>
              <div className={`text-[10px] font-bold tabular-nums ${
                f.impact === "positive" ? "text-emerald-300" : f.impact === "negative" ? "text-rose-300" : "text-slate-300"
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
            <span key={flag} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20 font-mono">
              {flag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 text-[10px] leading-6 text-slate-400 border-t border-white/5 pt-3">
        {report.disclosureAr}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" }) {
  const color =
    tone === "bad" ? "text-rose-300 border-rose-500/30 bg-rose-500/5" :
    tone === "warn" ? "text-amber-300 border-amber-500/30 bg-amber-500/5" :
    "text-emerald-300 border-emerald-500/30 bg-emerald-500/5";
  return (
    <div className={`rounded-2xl border px-3 py-2 ${color}`}>
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-sm font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
