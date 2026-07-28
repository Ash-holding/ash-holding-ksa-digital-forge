// Phase 8 — IFRS 9 ECL Dashboard & Stress Testing (Admin)
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ShieldAlert, TrendingUp, Layers, Activity, PlayCircle, Info, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/financing/ifrs9")({
  component: Ifrs9Page,
  head: () => ({
    meta: [
      { title: "IFRS 9 والاختبار الحسّاس — ASH Admin" },
      { name: "description", content: "لوحة الخسائر الائتمانية المتوقعة (ECL) واختبارات الإجهاد وفق معيار IFRS 9." },
    ],
  }),
});

type StageBucket = {
  key: "stage1" | "stage2" | "stage3";
  label?: string; labelAr: string;
  count: number; ead: number; pd?: number; lgd?: number; ecl: number; coveragePct: number;
};
type EclResponse = {
  generatedAt: string;
  inputs: { pdMultiplier: number; lgdMultiplier: number; macroShockPct: number };
  parameters: {
    pd12mBase: number; pdLifetimeBase: number; lgdBase: number;
    historicalDefaults: number; historicalTerminated: number; writtenOffContracts: number;
  };
  stages: StageBucket[];
  totals: { ead: number; ecl: number; coveragePct: number };
  perContract: { code: string; status: string; stage: string; ead: number; pd: number; lgd: number; ecl: number; dpd: number }[];
};
type Scenario = { id: string; nameAr: string; pdMultiplier: number; lgdMultiplier: number; macroShockPct: number; descriptionAr: string };
type StressResponse = {
  generatedAt: string;
  baseline: { parameters: EclResponse["parameters"]; stages: StageBucket[]; totals: EclResponse["totals"] };
  results: {
    id: string; nameAr: string;
    inputs: { pdMultiplier: number; lgdMultiplier: number; macroShockPct: number };
    stages: StageBucket[];
    totals: { ead: number; ecl: number; coveragePct: number };
    deltaVsBaseline: { ecl: number; pct: number };
  }[];
};

const fmtSAR = (n: number) => `${(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ﷼`;
const fmtInt = (n: number) => (n || 0).toLocaleString("ar-SA");
const fmtPct = (n: number) => `${((n || 0) * 100).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}٪`;

const STAGE_COLORS: Record<string, string> = {
  stage1: "#22c55e", stage2: "#f59e0b", stage3: "#ef4444",
};

function Ifrs9Page() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["baseline", "adverse", "severe"]));

  const { data: ecl, isLoading } = useQuery({
    queryKey: ["ifrs9-ecl"],
    queryFn: () => api.get<EclResponse>("/admin/financing/ifrs9/ecl").then((r) => r.data),
    refetchInterval: 60_000,
  });
  const { data: scenariosData } = useQuery({
    queryKey: ["ifrs9-scenarios"],
    queryFn: () => api.get<{ scenarios: Scenario[] }>("/admin/financing/ifrs9/stress-scenarios").then((r) => r.data),
  });

  const stressMut = useMutation({
    mutationFn: (scenarios: Scenario[]) =>
      api.post<StressResponse>("/admin/financing/ifrs9/stress-test", { scenarios }).then((r) => r.data),
    onError: (e: any) => toast.error(e?.response?.data?.error || "تعذّر تشغيل اختبار الإجهاد"),
    onSuccess: () => toast.success("تم تشغيل اختبار الإجهاد"),
  });

  const scenarios = scenariosData?.scenarios || [];
  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const runStress = () => {
    const chosen = scenarios.filter((s) => selected.has(s.id));
    if (!chosen.length) { toast.error("اختر سيناريو واحداً على الأقل"); return; }
    stressMut.mutate(chosen);
  };

  const stageChart = useMemo(() => (ecl?.stages || []).map((b) => ({
    name: b.labelAr, EAD: b.ead, ECL: b.ecl, fill: STAGE_COLORS[b.key],
  })), [ecl]);

  const stressChart = useMemo(() => {
    const r = stressMut.data;
    if (!r) return [];
    return [
      { name: "الأساسي", ECL: r.baseline.totals.ecl, coverage: r.baseline.totals.coveragePct * 100 },
      ...r.results.map((x) => ({ name: x.nameAr, ECL: x.totals.ecl, coverage: x.totals.coveragePct * 100 })),
    ];
  }, [stressMut.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="IFRS 9 — الخسائر الائتمانية المتوقعة"
        description="تصنيف المراحل، ECL، ومحاكاة السيناريوهات وفق معيار المحاسبة الدولي"
        icon={ShieldAlert}
      />

      {/* ------- Baseline KPIs ------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="إجمالي التعرّض (EAD)"
          value={isLoading ? "…" : fmtSAR(ecl?.totals.ead || 0)}
          icon={Layers} accent="from-cyan-500/20 to-cyan-500/5"
        />
        <KpiCard
          label="ECL الكلي"
          value={isLoading ? "…" : fmtSAR(ecl?.totals.ecl || 0)}
          icon={TrendingUp} accent="from-rose-500/20 to-rose-500/5"
        />
        <KpiCard
          label="نسبة التغطية"
          value={isLoading ? "…" : fmtPct(ecl?.totals.coveragePct || 0)}
          icon={Activity} accent="from-amber-500/20 to-amber-500/5"
        />
        <KpiCard
          label="عقود المرحلة 3"
          value={isLoading ? "…" : fmtInt(ecl?.stages.find((s) => s.key === "stage3")?.count || 0)}
          icon={ShieldAlert} accent="from-red-500/20 to-red-500/5"
        />
      </div>

      {/* ------- Parameters ------- */}
      {ecl && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm text-white/60">
            <Info className="h-4 w-4" /> المعاملات الأساسية (مشتقة من السجل التاريخي)
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <Param label="PD (12 شهر)" value={fmtPct(ecl.parameters.pd12mBase)} />
            <Param label="PD (مدى الحياة)" value={fmtPct(ecl.parameters.pdLifetimeBase)} />
            <Param label="LGD الأساسي" value={fmtPct(ecl.parameters.lgdBase)} />
            <Param label="حالات التعثر" value={fmtInt(ecl.parameters.historicalDefaults)} />
            <Param label="عقود منتهية" value={fmtInt(ecl.parameters.historicalTerminated)} />
            <Param label="مشطوبة" value={fmtInt(ecl.parameters.writtenOffContracts)} />
          </div>
        </div>
      )}

      {/* ------- Stage distribution ------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Layers className="h-5 w-5 text-cyan-400" /> التوزيع حسب المرحلة
          </h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={stageChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}
                  formatter={(v: any) => fmtSAR(v)}
                />
                <Legend />
                <Bar dataKey="EAD" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                <Bar dataKey="ECL" fill="#f87171" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="mb-4 text-lg font-semibold text-white">نصيب كل مرحلة من ECL</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={(ecl?.stages || []).map((s) => ({ name: s.labelAr, value: s.ecl, key: s.key }))}
                  dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}
                >
                  {(ecl?.stages || []).map((s) => (
                    <Cell key={s.key} fill={STAGE_COLORS[s.key]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}
                  formatter={(v: any) => fmtSAR(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ------- Stages table ------- */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="w-full text-right text-sm">
          <thead className="bg-white/[0.04] text-white/60">
            <tr>
              <th className="px-4 py-3">المرحلة</th>
              <th className="px-4 py-3">العقود</th>
              <th className="px-4 py-3">EAD</th>
              <th className="px-4 py-3">PD</th>
              <th className="px-4 py-3">LGD</th>
              <th className="px-4 py-3">ECL</th>
              <th className="px-4 py-3">التغطية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(ecl?.stages || []).map((s) => (
              <tr key={s.key} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_COLORS[s.key] }} />
                    {s.labelAr}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/80">{fmtInt(s.count)}</td>
                <td className="px-4 py-3 text-white/80">{fmtSAR(s.ead)}</td>
                <td className="px-4 py-3 text-white/80">{fmtPct(s.pd || 0)}</td>
                <td className="px-4 py-3 text-white/80">{fmtPct(s.lgd || 0)}</td>
                <td className="px-4 py-3 font-semibold text-rose-300">{fmtSAR(s.ecl)}</td>
                <td className="px-4 py-3 text-amber-300">{fmtPct(s.coveragePct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ------- Stress Testing ------- */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-transparent p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-indigo-300" /> اختبار الإجهاد (Stress Testing)
          </h3>
          <Button onClick={runStress} disabled={stressMut.isPending} className="gap-2">
            <PlayCircle className="h-4 w-4" /> {stressMut.isPending ? "جاري التشغيل…" : "تشغيل السيناريوهات"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {scenarios.map((s) => {
            const on = selected.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`rounded-xl border p-4 text-right transition ${
                  on ? "border-indigo-400/60 bg-indigo-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <div className="mb-1 font-semibold text-white">{s.nameAr}</div>
                <div className="mb-2 text-xs text-white/60">{s.descriptionAr}</div>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-white/70">
                  <span className="rounded-full bg-white/5 px-2 py-0.5">PD ×{s.pdMultiplier}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5">LGD ×{s.lgdMultiplier}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5">Shock {Math.round(s.macroShockPct * 100)}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {stressMut.data && (
          <div className="mt-6 space-y-4">
            <div className="h-72 rounded-xl border border-white/10 bg-black/20 p-3">
              <ResponsiveContainer>
                <BarChart data={stressChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#f87171" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}
                    formatter={(v: any, name: any) => name === "coverage" ? `${Number(v).toFixed(2)}%` : fmtSAR(v)}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="ECL" name="ECL" fill="#f87171" radius={[8, 8, 0, 0]} />
                  <Bar yAxisId="right" dataKey="coverage" name="التغطية %" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-right text-sm">
                <thead className="bg-white/[0.04] text-white/60">
                  <tr>
                    <th className="px-4 py-3">السيناريو</th>
                    <th className="px-4 py-3">EAD</th>
                    <th className="px-4 py-3">ECL</th>
                    <th className="px-4 py-3">التغطية</th>
                    <th className="px-4 py-3">Δ عن الأساسي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="bg-white/[0.03]">
                    <td className="px-4 py-3 font-semibold text-white">الأساسي</td>
                    <td className="px-4 py-3">{fmtSAR(stressMut.data.baseline.totals.ead)}</td>
                    <td className="px-4 py-3">{fmtSAR(stressMut.data.baseline.totals.ecl)}</td>
                    <td className="px-4 py-3">{fmtPct(stressMut.data.baseline.totals.coveragePct)}</td>
                    <td className="px-4 py-3 text-white/40">—</td>
                  </tr>
                  {stressMut.data.results.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-white">{r.nameAr}</td>
                      <td className="px-4 py-3 text-white/80">{fmtSAR(r.totals.ead)}</td>
                      <td className="px-4 py-3 font-semibold text-rose-300">{fmtSAR(r.totals.ecl)}</td>
                      <td className="px-4 py-3 text-amber-300">{fmtPct(r.totals.coveragePct)}</td>
                      <td className="px-4 py-3 text-rose-300">
                        +{fmtSAR(r.deltaVsBaseline.ecl)} <span className="text-white/50">({fmtPct(r.deltaVsBaseline.pct)})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-white/60">{label}</span>
        <Icon className="h-4 w-4 text-white/50" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
function Param({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  );
}
