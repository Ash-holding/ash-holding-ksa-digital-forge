import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonRows } from "@/components/dashboard/EmptyState";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const readOnly = user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN";
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });
  const save = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => api.put(`/settings/${key}`, { value }),
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const company = (data?.settings?.company as Record<string, string> | undefined) || {};

  if (isLoading) return <SkeletonRows rows={6} />;

  return (
    <>
      <PageHeader icon={Settings} title="الإعدادات" description="بيانات الشركة، الفواتير، والإشعارات." />
      <form
        className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (readOnly) return;
          const fd = new FormData(e.currentTarget);
          save.mutate({ key: "company", value: Object.fromEntries(fd.entries()) });
        }}
      >
        <h2 className="text-lg font-bold">بيانات الشركة</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الاسم بالعربية" name="nameAr" defaultValue={company.nameAr || ""} />
          <Field label="Name (English)" name="nameEn" dir="ltr" defaultValue={company.nameEn || ""} />
          <Field label="السجل التجاري" name="crNumber" dir="ltr" defaultValue={company.crNumber || ""} />
          <Field label="الرقم الضريبي" name="vatNumber" dir="ltr" defaultValue={company.vatNumber || ""} />
          <Field label="الجوال" name="phone" dir="ltr" defaultValue={company.phone || ""} />
          <Field label="البريد" name="email" dir="ltr" defaultValue={company.email || ""} />
          <div className="sm:col-span-2"><Field label="العنوان" name="address" defaultValue={company.address || ""} /></div>
        </div>
        <div className="pt-2 flex justify-end">
          <Button type="submit" disabled={save.isPending || readOnly} className="gap-2">
            <Save className="h-4 w-4" /> حفظ
          </Button>
        </div>
      </form>
    </>
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
