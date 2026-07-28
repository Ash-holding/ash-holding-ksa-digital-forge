import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wallet, FileText, ArrowLeft, Calculator as CalcIcon,
  ShieldCheck, Sparkles, ClipboardList, Clock,
  TrendingUp, CheckCircle2, Loader2, Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { FinancingCalculator } from "@/components/financing/Calculator";
import { CreditPreviewCard } from "@/components/financing/CreditPreviewCard";

type Row = {
  id: string;
  code: string;
  status: string;
  amount: number | string;
  termMonths: number;
  createdAt: string;
  submittedAt: string | null;
  product: { nameAr: string; code: string } | null;
};

const STATUS_TONE: Record<string, { chip: string; bar: string; label: string; step: number }> = {
  DRAFT:            { chip: "bg-slate-500/15 text-slate-300 ring-slate-500/30",      bar: "from-slate-500 to-slate-400",      label: "مسودة",              step: 0 },
  SUBMITTED:        { chip: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",         bar: "from-cyan-500 to-blue-500",         label: "تم التقديم",         step: 1 },
  KYC_REVIEW:       { chip: "bg-blue-500/15 text-blue-300 ring-blue-500/30",         bar: "from-blue-500 to-indigo-500",       label: "تحقق الهوية",        step: 2 },
  KYC_APPROVED:     { chip: "bg-blue-500/15 text-blue-200 ring-blue-500/30",         bar: "from-blue-500 to-indigo-500",       label: "اعتماد الهوية",      step: 3 },
  KYC_REJECTED:     { chip: "bg-rose-500/15 text-rose-300 ring-rose-500/30",         bar: "from-rose-600 to-rose-500",         label: "رفض التحقق",         step: 0 },
  CREDIT_REVIEW:    { chip: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",   bar: "from-indigo-500 to-purple-500",     label: "دراسة ائتمانية",     step: 4 },
  RISK_REVIEW:      { chip: "bg-purple-500/15 text-purple-300 ring-purple-500/30",   bar: "from-purple-500 to-fuchsia-500",    label: "مراجعة المخاطر",      step: 5 },
  COMMITTEE_REVIEW: { chip: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",bar: "from-fuchsia-500 to-pink-500",      label: "اللجنة الائتمانية",  step: 6 },
  PENDING_FINAL:    { chip: "bg-amber-500/15 text-amber-300 ring-amber-500/30",      bar: "from-amber-500 to-orange-500",      label: "اعتماد نهائي",       step: 7 },
  MORE_INFO:        { chip: "bg-amber-500/15 text-amber-200 ring-amber-500/30",      bar: "from-amber-500 to-yellow-500",      label: "معلومات إضافية",     step: 3 },
  APPROVED:         { chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",bar: "from-emerald-500 to-teal-500",      label: "معتمد",              step: 8 },
  REJECTED:         { chip: "bg-rose-500/15 text-rose-300 ring-rose-500/30",         bar: "from-rose-600 to-rose-500",         label: "مرفوض",              step: 0 },
  CANCELLED:        { chip: "bg-slate-500/15 text-slate-400 ring-slate-500/30",      bar: "from-slate-500 to-slate-400",       label: "ملغى",               step: 0 },
  EXPIRED:          { chip: "bg-slate-500/15 text-slate-400 ring-slate-500/30",      bar: "from-slate-500 to-slate-400",       label: "منتهي",              step: 0 },
};
const TOTAL_STEPS = 8;

export function ClientFinancingHub() {
  const { data, isLoading } = useQuery({
    queryKey: ["client-financing-applications"],
    queryFn: () => api.get<{ rows: Row[] }>("/financing/applications").then((r) => r.data),
    refetchInterval: 15000,
  });

  const rows = data?.rows ?? [];
  const drafts = rows.filter((r) => r.status === "DRAFT").length;
  const active = rows.filter((r) => !["DRAFT", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED"].includes(r.status)).length;
  const approved = rows.filter((r) => r.status === "APPROVED").length;

  return (
    <div className="space-y-8">
      <ClientPageHeader
        icon={Wallet}
        title="تمويل خدمات ASH"
        description="تقييم ائتماني فوري، حاسبة قسط ذكية، وتتبع لحظي لمراحل طلبك."
        actions={null}
      />

      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard icon={ClipboardList} label="إجمالي الطلبات" value={rows.length} tone="from-slate-500 to-slate-400" loading={isLoading} />
        <KpiCard icon={FileText} label="مسودات" value={drafts} tone="from-cyan-500 to-blue-500" loading={isLoading} />
        <KpiCard icon={Loader2} label="قيد المراجعة" value={active} tone="from-indigo-500 to-purple-500" loading={isLoading} />
        <KpiCard icon={CheckCircle2} label="معتمدة" value={approved} tone="from-emerald-500 to-teal-500" loading={isLoading} />
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "تقييم داخلي معتمد", desc: "نظام نقاط ٣٠٠–٨٥٠ بمعايير قريبة من سمة" },
          { icon: Sparkles, title: "نتيجة فورية", desc: "احصل على تقديرك خلال ثوانٍ" },
          { icon: ClipboardList, title: "تدقيق يدوي", desc: "لجنة ائتمان مستقلة قبل الاعتماد" },
        ].map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-electric/20 to-indigo-500/10 text-electric ring-1 ring-electric/20">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground">{s.title}</div>
                <div className="text-[11px] leading-6 text-muted-foreground">{s.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <CreditPreviewCard />

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-electric">
          <CalcIcon className="h-4 w-4" /> حاسبة القسط وتقديم الطلب
        </div>
        <div className="rounded-3xl border border-border bg-card/40 p-4 md:p-6">
          <FinancingCalculator />
        </div>
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">طلباتي</span>
          </div>
          {rows.length > 0 && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {rows.length} طلب • تحديث كل ١٥ث
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-card/40 ring-1 ring-border" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-electric/20 to-purple-accent/10 text-electric">
              <Zap className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">لا توجد طلبات تمويل بعد.</p>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
              استخدم الحاسبة أعلاه لاختيار المنتج ثم اضغط «تقديم الطلب» <ArrowLeft className="h-4 w-4" />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((r) => {
              const tone = STATUS_TONE[r.status] ?? STATUS_TONE.DRAFT;
              const pct = Math.round((tone.step / TOTAL_STEPS) * 100);
              return (
                <Link
                  key={r.id}
                  to="/client/financing/$id"
                  params={{ id: r.id }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-4 transition hover:-translate-y-0.5 hover:border-electric/40 hover:shadow-[0_20px_40px_-25px_rgba(59,130,246,0.4)]"
                >
                  <div aria-hidden className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${tone.bar} opacity-[0.08] blur-2xl transition group-hover:opacity-[0.16]`} />
                  <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-electric">{r.code}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${tone.chip}`}>{tone.label}</span>
                      </div>
                      <div className="mt-1.5 truncate text-sm font-bold text-foreground">{r.product?.nameAr ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {new Intl.NumberFormat("ar-SA").format(Number(r.amount))} ر.س • {r.termMonths} شهر
                      </div>
                    </div>
                    <ArrowLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-electric" />
                  </div>
                  <div className="relative mt-4">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>تقدم الطلب</span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
                      />
                    </div>
                  </div>
                  {r.status === "APPROVED" && (
                    <div className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                      <TrendingUp className="h-3 w-3" /> جاهز للتوقيع
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, tone, loading,
}: { icon: typeof Wallet; label: string; value: number; tone: string; loading?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/50 p-4">
      <div aria-hidden className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-2xl`} />
      <div className="relative flex items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-lg`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-2xl font-black tabular-nums text-foreground">
            {loading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-muted/30" /> : value}
          </div>
        </div>
      </div>
    </div>
  );
}