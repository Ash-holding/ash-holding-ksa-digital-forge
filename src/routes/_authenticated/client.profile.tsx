import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { User, Save, ShieldCheck, MapPin, Mail, Phone, Building2, BadgeCheck, AlertCircle } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { SkeletonRows } from "@/components/dashboard/EmptyState";

export const Route = createFileRoute("/_authenticated/client/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["client-me"], queryFn: async () => (await api.get("/clients/me")).data });
  const save = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.patch("/clients/me", d),
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["client-me"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const c = data?.client;
  const fields = ["companyName", "commercialNumber", "taxNumber", "phone", "contactEmail", "city", "address"] as const;
  const completeness = useMemo(() => {
    if (!c) return 0;
    const filled = fields.filter((f) => (c as any)[f] && String((c as any)[f]).trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [c]);
  const verified = c?.verificationStatus === "VERIFIED";

  if (isLoading) return <div className="space-y-3"><SkeletonRows rows={6} /></div>;

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={User}
        title="ملفي الشخصي"
        description="أكمل بياناتك لتفعيل جميع الخدمات وتسريع المعاملات."
        actions={
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 h-8 text-xs font-bold ${verified ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-amber-500/40 bg-amber-500/10 text-amber-400"}`}>
            {verified ? <BadgeCheck className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {verified ? "حساب موثّق" : "بانتظار التوثيق"}
          </span>
        }
      />

      {/* Identity + completeness */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-electric to-purple-accent text-white grid place-items-center text-xl font-black shadow-glow">
              {user?.name?.[0] ?? "؟"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-lg truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate" dir="ltr">{user?.email}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c?.companyName && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-electric/10 text-electric px-2 py-0.5 text-[10px] font-bold">
                    <Building2 className="h-3 w-3" />{c.companyName}
                  </span>
                )}
                {c?.city && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-accent/10 text-purple-accent px-2 py-0.5 text-[10px] font-bold">
                    <MapPin className="h-3 w-3" />{c.city}
                  </span>
                )}
                {c?.phone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 text-cyan-400 px-2 py-0.5 text-[10px] font-bold" dir="ltr">
                    <Phone className="h-3 w-3" />{c.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-electric" />
            <h3 className="text-sm font-bold">اكتمال الملف</h3>
          </div>
          <div className="text-3xl font-black tracking-tight mb-1">{completeness}%</div>
          <Progress value={completeness} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground mt-2">
            {completeness === 100 ? "🎉 ملفك مكتمل!" : "أكمل الحقول المتبقية للاستفادة من كل الخدمات."}
          </p>
        </div>
      </div>

      {/* Editable form */}
      <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-electric" />
          <h3 className="text-sm font-bold">بيانات التواصل والشركة</h3>
        </div>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            save.mutate(Object.fromEntries(fd.entries()));
          }}
        >
          <Field label="اسم الشركة" name="companyName" defaultValue={c?.companyName || ""} />
          <Field label="السجل التجاري" name="commercialNumber" dir="ltr" defaultValue={c?.commercialNumber || ""} />
          <Field label="الرقم الضريبي" name="taxNumber" dir="ltr" defaultValue={c?.taxNumber || ""} />
          <Field label="الجوال" name="phone" dir="ltr" defaultValue={c?.phone || ""} />
          <Field label="بريد التواصل" name="contactEmail" dir="ltr" defaultValue={c?.contactEmail || ""} />
          <Field label="المدينة" name="city" defaultValue={c?.city || ""} />
          <div className="sm:col-span-2"><Field label="العنوان" name="address" defaultValue={c?.address || ""} /></div>
          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button type="submit" disabled={save.isPending} className="gap-2"><Save className="h-4 w-4" />حفظ التغييرات</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Input {...rest} /></div>
  );
}
