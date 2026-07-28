import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, PlayCircle, Bell, AlertTriangle, Wallet, Settings } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/financing/ops")({
  component: FinancingOpsPanel,
  head: () => ({ meta: [{ title: "تشغيل التمويل — ASH Admin" }] }),
});

type Settings = {
  reminderDaysBefore: number;
  gracePeriodDays: number;
  latePenaltyPct: number | string;
  latePenaltyCapPct: number | string;
  autopayDefaultOn: boolean;
};

function FinancingOpsPanel() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["fin-ops-settings"],
    queryFn: () => api.get<Settings>("/financing/admin/settings/ops").then((r) => r.data),
  });

  const [form, setForm] = useState<Partial<Settings>>({});
  const current = { ...(settings || {}), ...form } as Settings;

  const save = useMutation({
    mutationFn: () => api.patch("/financing/admin/settings/ops", {
      reminderDaysBefore: Number(current.reminderDaysBefore),
      gracePeriodDays: Number(current.gracePeriodDays),
      latePenaltyPct: Number(current.latePenaltyPct),
      latePenaltyCapPct: Number(current.latePenaltyCapPct),
      autopayDefaultOn: !!current.autopayDefaultOn,
    }),
    onSuccess: () => { toast.success("تم حفظ الإعدادات"); qc.invalidateQueries({ queryKey: ["fin-ops-settings"] }); setForm({}); },
    onError: (e) => toast.error(apiError(e) || "تعذر الحفظ"),
  });

  const runJob = useMutation({
    mutationFn: (job: string) => api.post(`/financing/admin/ops/run/${job}`),
    onSuccess: (r, job) => toast.success(`✅ اكتملت مهمة "${job}" — ${JSON.stringify(r.data.result)}`),
    onError: (e) => toast.error(apiError(e) || "فشل التشغيل"),
  });

  const jobs = [
    { key: "reminders", label: "إرسال تذكيرات الأقساط", icon: Bell, color: "bg-electric" },
    { key: "overdue", label: "تحديث الأقساط المتأخرة وتطبيق الغرامات", icon: AlertTriangle, color: "bg-amber-500" },
    { key: "autopay", label: "تشغيل السداد التلقائي من المحافظ", icon: Wallet, color: "bg-emerald-500" },
    { key: "all", label: "تشغيل الكل معاً", icon: PlayCircle, color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="تشغيل التمويل"
        description="إدارة مهام التذكير، الأقساط المتأخرة، والسداد التلقائي"
        icon={Activity}
      />

      {/* Manual triggers */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-bold mb-3 flex items-center gap-2"><PlayCircle className="h-4 w-4" /> تشغيل يدوي</div>
        <div className="grid gap-3 md:grid-cols-2">
          {jobs.map((j) => (
            <button
              key={j.key}
              onClick={() => runJob.mutate(j.key)}
              disabled={runJob.isPending}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-4 text-right hover:border-white/25 transition"
            >
              <div className={`h-10 w-10 rounded-lg ${j.color}/20 border ${j.color}/40 grid place-items-center`}>
                <j.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{j.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">اضغط للتشغيل الآن</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Cron info */}
      <section className="rounded-2xl border border-electric/20 bg-electric/5 p-4 text-xs">
        <div className="font-bold text-electric mb-1">🕐 الجدولة التلقائية</div>
        <div className="text-slate-300 leading-relaxed">
          نقطة الاستدعاء العامة: <code className="text-electric" dir="ltr">POST /api/public/financing/cron/run</code>
          <br />
          الرأس المطلوب: <code dir="ltr">X-Cron-Secret: $CRON_SECRET</code>
          <br />
          الموصى به: cron كل ساعة عبر pg_cron أو أي مجدول خارجي.
        </div>
      </section>

      {/* Settings */}
      {settings && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="text-sm font-bold flex items-center gap-2"><Settings className="h-4 w-4" /> إعدادات التشغيل</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="عدد الأيام قبل الاستحقاق لإرسال التذكير">
              <Input type="number" value={current.reminderDaysBefore ?? ""} onChange={(e) => setForm({ ...form, reminderDaysBefore: Number(e.target.value) })} />
            </Field>
            <Field label="فترة السماح قبل تصنيف القسط كمتأخر (أيام)">
              <Input type="number" value={current.gracePeriodDays ?? ""} onChange={(e) => setForm({ ...form, gracePeriodDays: Number(e.target.value) })} />
            </Field>
            <Field label="نسبة غرامة التأخير (٪ من القسط)">
              <Input type="number" step="0.1" value={String(current.latePenaltyPct ?? "")} onChange={(e) => setForm({ ...form, latePenaltyPct: Number(e.target.value) })} />
            </Field>
            <Field label="الحد الأقصى للغرامة (٪ من القسط)">
              <Input type="number" step="0.1" value={String(current.latePenaltyCapPct ?? "")} onChange={(e) => setForm({ ...form, latePenaltyCapPct: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <div>
              <div className="text-sm font-semibold">تفعيل السداد التلقائي افتراضياً</div>
              <div className="text-xs text-muted-foreground">للعقود الجديدة عند التفعيل</div>
            </div>
            <Switch checked={!!current.autopayDefaultOn} onCheckedChange={(v) => setForm({ ...form, autopayDefaultOn: v })} />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending || Object.keys(form).length === 0}>
            حفظ الإعدادات
          </Button>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      {children}
    </label>
  );
}
