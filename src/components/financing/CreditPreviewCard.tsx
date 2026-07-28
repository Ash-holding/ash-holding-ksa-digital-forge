import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Loader2, TrendingUp, Wallet, BadgeCheck } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { InternalCreditReportPanel, type CreditReport } from "./InternalCreditReport";

type FieldProps = {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  suffix?: string;
  type?: string;
  placeholder?: string;
};
function Field({ label, value, onChange, suffix, type = "number", placeholder }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-electric/60 focus:ring-2 focus:ring-electric/20"
        />
        {suffix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

const EMPLOYMENTS: { v: string; l: string }[] = [
  { v: "GOVERNMENT", l: "حكومي" },
  { v: "MILITARY", l: "عسكري" },
  { v: "PRIVATE", l: "قطاع خاص" },
  { v: "SELF_EMPLOYED", l: "عمل حر" },
  { v: "FREELANCE", l: "مستقل" },
  { v: "OTHER", l: "أخرى" },
];

export function CreditPreviewCard() {
  const [amount, setAmount] = useState<number>(50000);
  const [term, setTerm] = useState<number>(24);
  const [income, setIncome] = useState<number>(15000);
  const [oblig, setOblig] = useState<number>(2500);
  const [years, setYears] = useState<number>(3);
  const [emp, setEmp] = useState<string>("PRIVATE");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CreditReport | null>(null);

  async function run() {
    setLoading(true);
    try {
      const { data } = await api.post<{ report: CreditReport }>("/financing/credit-preview", {
        amount: Number(amount),
        termMonths: Number(term),
        monthlyIncome: Number(income),
        monthlyObligations: Number(oblig),
        yearsOfService: Number(years),
        employmentType: emp,
      });
      setReport(data.report);
    } catch (e) {
      toast.error(apiError(e) || "تعذّر توليد التقرير");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-indigo-500/10 via-electric/5 to-cyan-500/10 p-6"
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-electric/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-electric to-indigo-500 text-white shadow-lg shadow-electric/25">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              التقييم الائتماني الفوري
              <span className="rounded-full bg-electric/15 px-2 py-0.5 text-[10px] font-semibold text-electric">ASH Credit Bureau</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              نظام تقييم داخلي بمعايير مشابهة لسمة — نتيجة فورية، ثم يعاد التدقيق من المحلل الائتماني قبل الاعتماد النهائي.
            </p>
          </div>
          <div className="ms-auto hidden items-center gap-4 text-[11px] text-muted-foreground md:flex">
            <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-electric" /> ٣٠٠–٨٥٠</span>
            <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> DTI / DSR</span>
            <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5 text-cyan-500" /> قدرة السداد</span>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="مبلغ التمويل المطلوب" suffix="﷼" value={amount} onChange={(v) => setAmount(Number(v) || 0)} />
          <Field label="مدة السداد" suffix="شهر" value={term} onChange={(v) => setTerm(Number(v) || 0)} />
          <Field label="الدخل الشهري الصافي" suffix="﷼" value={income} onChange={(v) => setIncome(Number(v) || 0)} />
          <Field label="الالتزامات الشهرية القائمة" suffix="﷼" value={oblig} onChange={(v) => setOblig(Number(v) || 0)} />
          <Field label="مدة العمل الحالية" suffix="سنة" value={years} onChange={(v) => setYears(Number(v) || 0)} />
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">جهة العمل</span>
            <select
              value={emp}
              onChange={(e) => setEmp(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm text-foreground outline-none focus:border-electric/60 focus:ring-2 focus:ring-electric/20"
            >
              {EMPLOYMENTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </label>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] text-muted-foreground">
            * التقييم إرشادي فوري، ولا يعتبر قراراً نهائياً. يتم التدقيق يدوياً وربطه بالمستندات.
          </p>
          <button
            onClick={run}
            disabled={loading || !amount || !term || !income}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-electric via-indigo-500 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-electric/25 transition hover:shadow-electric/40 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            احسب درجتي الائتمانية الآن
          </button>
        </div>
      </motion.div>

      {report && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <InternalCreditReportPanel report={report} />
        </motion.div>
      )}
    </div>
  );
}
