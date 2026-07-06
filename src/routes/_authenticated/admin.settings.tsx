import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Settings, Save, Building2, Receipt, Shield, Bell } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonRows } from "@/components/dashboard/EmptyState";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

const TABS = [
  { key: "company", label: "الشركة", icon: Building2 },
  { key: "billing", label: "الفوترة", icon: Receipt },
  { key: "security", label: "الأمان", icon: Shield },
  { key: "notifications", label: "الإشعارات", icon: Bell },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function SettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const readOnly = user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN";
  const [tab, setTab] = useState<TabKey>("company");
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });
  const save = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => api.put(`/settings/${key}`, { value }),
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const settings = data?.settings ?? {};
  const company = (settings.company as Record<string, string> | undefined) || {};
  const billing = (settings.billing as Record<string, string | number> | undefined) || {};
  const security = (settings.security as Record<string, boolean | number> | undefined) || {};

  if (isLoading) return <SkeletonRows rows={6} />;

  return (
    <>
      <PageHeader icon={Settings} title="الإعدادات" description="بيانات الشركة، الفوترة، الأمان، والإشعارات." />

      {/* Tab bar — horizontal scroll on mobile */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 h-10 text-sm font-semibold transition",
                active ? "bg-electric text-primary-foreground border-electric shadow-glow" : "border-border bg-card text-foreground/80 hover:bg-muted/50",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "company" && (
        <SettingForm readOnly={readOnly} pending={save.isPending}
          onSubmit={(v) => save.mutate({ key: "company", value: v })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الاسم بالعربية" name="nameAr" defaultValue={company.nameAr || ""} />
            <Field label="Name (English)" name="nameEn" dir="ltr" defaultValue={company.nameEn || ""} />
            <Field label="السجل التجاري" name="crNumber" dir="ltr" defaultValue={company.crNumber || ""} />
            <Field label="الرقم الضريبي" name="vatNumber" dir="ltr" defaultValue={company.vatNumber || ""} />
            <Field label="الجوال" name="phone" dir="ltr" defaultValue={company.phone || ""} />
            <Field label="البريد" name="email" dir="ltr" defaultValue={company.email || ""} />
            <div className="sm:col-span-2"><Field label="العنوان" name="address" defaultValue={company.address || ""} /></div>
          </div>
        </SettingForm>
      )}

      {tab === "billing" && (
        <SettingForm readOnly={readOnly} pending={save.isPending}
          onSubmit={(v) => save.mutate({ key: "billing", value: { ...v, taxRate: Number(v.taxRate) } })}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="العملة" name="currency" dir="ltr" defaultValue={String(billing.currency ?? "SAR")} />
            <Field label="نسبة الضريبة %" name="taxRate" type="number" dir="ltr" defaultValue={String(billing.taxRate ?? 15)} />
            <Field label="بادئة رقم الفاتورة" name="invoicePrefix" dir="ltr" defaultValue={String(billing.invoicePrefix ?? "INV-")} />
          </div>
        </SettingForm>
      )}

      {tab === "security" && (
        <SettingForm readOnly={readOnly} pending={save.isPending}
          onSubmit={(v) => save.mutate({ key: "security", value: { twoFactor: v.twoFactor === "on", sessionTimeoutMinutes: Number(v.sessionTimeoutMinutes) } })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <input type="checkbox" name="twoFactor" defaultChecked={!!security.twoFactor} className="h-4 w-4" />
              <div><div className="font-semibold text-sm">المصادقة الثنائية</div><div className="text-xs text-muted-foreground">تفعيل تسجيل الدخول بخطوتين لجميع المستخدمين</div></div>
            </label>
            <Field label="مهلة انتهاء الجلسة (دقيقة)" name="sessionTimeoutMinutes" type="number" dir="ltr" defaultValue={String(security.sessionTimeoutMinutes ?? 60)} />
          </div>
        </SettingForm>
      )}

      {tab === "notifications" && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          إعدادات الإشعارات (بريد/واتساب/داخل التطبيق) — قيد التطوير.
        </div>
      )}
    </>
  );
}

function SettingForm({
  onSubmit, readOnly, pending, children,
}: { onSubmit: (v: Record<string, string>) => void; readOnly: boolean; pending: boolean; children: React.ReactNode }) {
  return (
    <form
      className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (readOnly) return;
        const fd = new FormData(e.currentTarget);
        onSubmit(Object.fromEntries(fd.entries()) as Record<string, string>);
      }}
    >
      {children}
      <div className="pt-2 flex justify-end">
        <Button type="submit" disabled={pending || readOnly} className="gap-2">
          <Save className="h-4 w-4" /> حفظ
        </Button>
      </div>
    </form>
  );
}

function Field({ label, ...rest }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...rest} />
    </div>
  );
}
