import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Save } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  if (isLoading) return <SkeletonRows rows={6} />;
  const c = data?.client;

  return (
    <>
      <div className="flex items-center gap-2"><User className="h-5 w-5 text-electric" /><h1 className="text-xl font-black">ملفي الشخصي</h1></div>

      <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-electric/10 text-electric grid place-items-center text-xl font-bold">
            {user?.name?.[0] ?? "؟"}
          </div>
          <div>
            <div className="font-bold text-lg">{user?.name}</div>
            <div className="text-xs text-muted-foreground" dir="ltr">{user?.email}</div>
          </div>
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
    </>
  );
}

function Field({ label, ...rest }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5"><Label>{label}</Label><Input {...rest} /></div>
  );
}
