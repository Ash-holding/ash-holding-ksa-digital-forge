import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, ArrowRight, Loader2 } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { ClientFormFields } from "@/components/dashboard/ClientFormFields";

export const Route = createFileRoute("/_authenticated/admin/clients/new")({
  component: NewClientPage,
});

function NewClientPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/clients", data),
    onSuccess: (r) => {
      toast.success("تم إنشاء العميل بنجاح");
      qc.invalidateQueries({ queryKey: ["clients"] });
      const id = r.data?.client?.id;
      if (id) nav({ to: "/admin/clients/$id", params: { id } });
      else nav({ to: "/admin/clients" });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
          const fd = new FormData(e.currentTarget);
          const data = Object.fromEntries(fd.entries());
          await create.mutateAsync(data);
        } finally { setSubmitting(false); }
      }}
    >
      <PageHeader
        icon={UserPlus}
        title="عميل جديد"
        description="إنشاء حساب دخول للعميل مع بيانات الشركة والعنوان."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" asChild>
              <Link to="/admin/clients"><ArrowRight className="h-4 w-4" /> إلغاء</Link>
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              إنشاء العميل
            </Button>
          </div>
        }
      />
      <ClientFormFields mode="create" />
    </form>
  );
}
