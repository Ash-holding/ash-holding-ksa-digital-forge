import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { UserCog, ArrowRight, Loader2 } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { ClientFormFields } from "@/components/dashboard/ClientFormFields";
import { SkeletonRows, EmptyState } from "@/components/dashboard/EmptyState";

export const Route = createFileRoute("/_authenticated/admin/clients/$id/edit")({
  component: EditClientPage,
});

function EditClientPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
  });
  const c = data?.client;

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch(`/clients/${id}`, patch),
    onSuccess: () => {
      toast.success("تم حفظ التعديلات");
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      nav({ to: "/admin/clients/$id", params: { id } });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading) return <SkeletonRows rows={8} />;
  if (!c) return <EmptyState title="العميل غير موجود" />;

  const defaults = {
    name: c.user?.name, email: c.user?.email, phone: c.phone || c.user?.phone,
    companyName: c.companyName, commercialNumber: c.commercialNumber, taxNumber: c.taxNumber,
    contactEmail: c.contactEmail, address: c.address, city: c.city, country: c.country,
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
          const fd = new FormData(e.currentTarget);
          const data = Object.fromEntries(fd.entries());
          await update.mutateAsync(data);
        } finally { setSubmitting(false); }
      }}
    >
      <PageHeader
        icon={UserCog}
        title={`تعديل: ${c.user?.name ?? "العميل"}`}
        description={c.companyName || "بدون اسم شركة"}
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" asChild>
              <Link to="/admin/clients/$id" params={{ id }}><ArrowRight className="h-4 w-4" /> إلغاء</Link>
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ التعديلات
            </Button>
          </div>
        }
      />
      <ClientFormFields mode="edit" defaults={defaults} />
    </form>
  );
}
