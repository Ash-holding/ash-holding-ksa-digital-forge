import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BarChart3, TrendingUp, AlertTriangle, ShieldCheck, Download,
  Wallet, PieChart as PieIcon, Activity, FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { api, apiError, getAccessToken } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/financing/reports")({
  component: FinancingReportsPage,
  head: () => ({ meta: [{ title: "تقارير التمويل — ASH Admin" }] }),
});

type Overview = {
  generatedAt: string;
  contractCount: number;
  activeContracts: number;
  terminatedContracts: number;
  totals: {
    grossFinanced: number; grossPayable: number; grossInterest: number;
    outstandingPrincipal: number; outstandingTotal: number;
    collectedPrincipal: number; collectedTotal: number; penaltiesAccrued: number;
  };
  statusDistribution: { status: string; count: number; financed: number; payable: number }[];
  aging: { current: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number };
  activeOutstanding: number;
  risk: {
    nplRatioPct: number; nplExposure: number; pdPct: number; lgdPct: number;
    lgdLossSum: number; lgdExposureSum: number; defaultedCount: number; writtenOffCount: number;
  };
  applicationsFunnel: { stage: string; count: number }[];
};
type Monthly = { months: number; start: string; series: { month: string; disbursed: number; collected: number; newContracts: number; principalCollected: number; interestCollected: number }[] };

const STATUS_AR: Record<string, string> = {
  DRAFT: "مسودة", AWAITING_CLIENT_SIGNATURE: "بانتظار التوقيع", SIGNED: "موقّع",
  ACTIVE: "نشط", COMPLETED: "مكتمل", DEFAULTED: "متعثر", CANCELLED: "ملغى",
  EARLY_SETTLED: "سداد مبكر", RESTRUCTURED: "معاد جدولته", WRITTEN_OFF: "مشطوب",
};
const STAGE_AR: Record<string, string> = {
  DRAFT: "مسودة", SUBMITTED: "مقدّم", DOCS_REVIEW: "مراجعة مستندات",
  CREDIT_REVIEW: "مراجعة ائتمانية", COMMITTEE: "اللجنة", APPROVED: "موافق عليه",
  REJECTED: "مرفوض", WITHDRAWN: "منسحب",
};
const fmtSAR = (n: number) => `${(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ﷼`;
const fmtInt = (n: number) => (n || 0).toLocaleString("ar-SA");
const fmtPct = (n: number) => `${(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}٪`;

const COLORS = ["#22d3ee", "#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#f87171", "#34d399", "#818cf8", "#fb923c", "#94a3b8"];

function FinancingReportsPage() {
  const [months, setMonths] = useState(12);

  const { data: overview, isLoading: loadingOv, error: errOv } = useQuery({
    queryKey: ["fin-reports-overview"],
    queryFn: () => api.get<Overview>("/admin/financing/reports/overview").then((r) => r.data),
    refetchInterval: 60_000,
  });
  const { data: monthly } = useQuery({
    queryKey: ["fin-reports-monthly", months],
    queryFn: () => api.get<Monthly>(`/admin/financing/reports/monthly?months=${months}`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const agingData = useMemo(() => overview ? [
    { name: "0", label: "غير متأخر", value: overview.aging.current },
    { name: "1-30", label: "1-30 يوم", value: overview.aging.d1_30 },
    { name: "31-60", label: "31-60 يوم", value: overview.aging.d31_60 },
    { name: "61-90", label: "61-90 يوم", value: overview.aging.d61_90 },
    { name: "90+", label: "أكثر من 90", value: overview.aging.d90_plus },
  ] : [], [overview]);

  const statusData = useMemo(() => overview?.statusDistribution.filter((s) => s.count > 0).map((s) => ({
    ...s, label: STATUS_AR[s.status] || s.status,
  })) || [], [overview]);

  const funnelData = useMemo(() => overview?.applicationsFunnel.map((s) => ({
    stage: STAGE_AR[s.stage] || s.stage, count: s.count,
  })) || [], [overview]);

  async function downloadCsv(kind: "exposure" | "installments" | "applications") {
    try {
      const token = getAccessToken();
      const base = (api.defaults.baseURL || "").replace(/\/$/, "");
      const url = `${base}/admin/financing/reports/export/${kind}.csv`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`فشل التحميل (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ash-financing-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      toast.success(`تم تحميل تقرير ${kind}`);
    } catch (e) {
      toast.error(apiError(e) || "تعذر تحميل التقرير");
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تقارير التمويل التنظيمية"
        description="مؤشرات المحفظة، التعرض والمخاطر (PD / LGD / NPL / PAR) بأسلوب SAMA"
        icon={BarChart3}
      />

      {errOv && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          تعذر تحميل التقارير — {apiError(errOv)}
        </div>
      )}

      {/* KPI Bento */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard title="إجمالي المموّل" value={fmtSAR(overview?.totals.grossFinanced || 0)} icon={Wallet} loading={loadingOv} accent="from-cyan-500/20 to-cyan-500/5" />
        <KpiCard title="الرصيد القائم (أصل)" value={fmtSAR(overview?.totals.outstandingPrincipal || 0)} icon={TrendingUp} loading={loadingOv} accent="from-sky-500/20 to-sky-500/5" />
        <KpiCard title="المُحصّل (إجمالي)" value={fmtSAR(overview?.totals.collectedTotal || 0)} icon={ShieldCheck} loading={loadingOv} accent="from-emerald-500/20 to-emerald-500/5" />
        <KpiCard title="الأرباح المتراكمة" value={fmtSAR(overview?.totals.grossInterest || 0)} icon={Activity} loading={loadingOv} accent="from-violet-500/20 to-violet-500/5" />
        <KpiCard title="نسبة NPL" value={fmtPct(overview?.risk.nplRatioPct || 0)} icon={AlertTriangle} loading={loadingOv} accent="from-amber-500/20 to-amber-500/5" />
        <KpiCard title="PD (الاحتمالية)" value={fmtPct(overview?.risk.pdPct || 0)} icon={PieIcon} loading={loadingOv} accent="from-rose-500/20 to-rose-500/5" />
        <KpiCard title="LGD (الخسارة)" value={fmtPct(overview?.risk.lgdPct || 0)} icon={AlertTriangle} loading={loadingOv} accent="from-fuchsia-500/20 to-fuchsia-500/5" />
        <KpiCard title="عقود نشطة" value={fmtInt(overview?.activeContracts || 0)} icon={ShieldCheck} loading={loadingOv} accent="from-indigo-500/20 to-indigo-500/5" />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="السلاسل الشهرية (صرف / تحصيل)" right={
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-xs">
            {[6, 12, 18, 24, 36].map((m) => <option key={m} value={m}>{m} شهر</option>)}
          </select>
        }>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                  formatter={(v: number) => fmtSAR(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="disbursed" name="المصروف" stroke="#22d3ee" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="collected" name="المُحصّل" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="تقادم الرصيد القائم (PAR)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                  formatter={(v: number) => fmtSAR(v)} />
                <Bar dataKey="value" name="أصل المبلغ" radius={[8, 8, 0, 0]}>
                  {agingData.map((_, i) => (
                    <Cell key={i} fill={["#34d399", "#fbbf24", "#f59e0b", "#f87171", "#dc2626"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="توزيع العقود حسب الحالة">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="label" outerRadius={95} label={(e: { label: string; count: number }) => `${e.label}: ${e.count}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="قمع الطلبات (آخر 90 يوم)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={11} width={110} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Bar dataKey="count" name="الطلبات" fill="#a78bfa" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Risk summary */}
      {overview && (
        <Panel title="ملخّص المخاطر التنظيمي">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
            <MiniStat label="التعرض المتعثر (NPL)" value={fmtSAR(overview.risk.nplExposure)} sub={`عقود مشطوبة: ${overview.risk.writtenOffCount} — متعثرة: ${overview.risk.defaultedCount}`} />
            <MiniStat label="أساس PD" value={`${overview.terminatedContracts} عقد منتهي`} sub={`متعثرة/مشطوبة: ${overview.risk.defaultedCount + overview.risk.writtenOffCount}`} />
            <MiniStat label="أساس LGD" value={fmtSAR(overview.risk.lgdExposureSum)} sub={`خسارة فعلية: ${fmtSAR(overview.risk.lgdLossSum)}`} />
            <MiniStat label="غرامات متراكمة" value={fmtSAR(overview.totals.penaltiesAccrued)} sub="مطبقة على الأقساط المتأخرة" />
          </div>
        </Panel>
      )}

      {/* CSV Exports */}
      <Panel title="تنزيل التقارير (CSV)" icon={FileSpreadsheet}>
        <div className="grid gap-3 md:grid-cols-3">
          <ExportButton label="التعرض لكل عقد" description="عقود بأرصدة قائمة، DPD، الحالة" onClick={() => downloadCsv("exposure")} />
          <ExportButton label="جميع الأقساط" description="جدول تفصيلي لكل قسط ومدفوعاته" onClick={() => downloadCsv("installments")} />
          <ExportButton label="الطلبات" description="تاريخ الطلبات ومسار المراجعة" onClick={() => downloadCsv("applications")} />
        </div>
        <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          الملفات مُشفّرة UTF-8 مع BOM لدعم عرض العربية في Excel مباشرة. جميع عمليات التصدير مُسجّلة في سجل تدقيق التمويل.
        </div>
      </Panel>

      {overview && (
        <div className="text-[11px] text-slate-500 text-left">
          آخر تحديث: {new Date(overview.generatedAt).toLocaleString("ar-SA")}
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, loading, accent }: {
  title: string; value: string; icon: React.ComponentType<{ className?: string }>; loading?: boolean; accent: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-300">{title}</div>
          <div className="mt-2 text-lg font-bold tracking-tight truncate">
            {loading ? <span className="inline-block h-5 w-20 rounded bg-white/10 animate-pulse" /> : value}
          </div>
        </div>
        <div className="h-9 w-9 rounded-lg bg-white/10 grid place-items-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, right, children }: {
  title: string; icon?: React.ComponentType<{ className?: string }>; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-bold flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-electric" />} {title}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function ExportButton({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-4 text-right hover:border-electric/40 transition">
      <div className="h-10 w-10 rounded-lg bg-electric/15 border border-electric/30 grid place-items-center shrink-0">
        <Download className="h-4 w-4 text-electric" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

export default FinancingReportsPage;
