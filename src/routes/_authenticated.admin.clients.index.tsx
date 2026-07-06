import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Trash2 } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { FormSheet } from "@/components/dashboard/FormSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/clients/")({
  component: ClientsPage,
});

type ClientRow = {
  id: string; companyName?: string | null; phone?: string | null; city?: string | null;
  status: string; createdAt: string;
  user: { id: string; name: string; email: string; phone?: string | null; status: string };
};

function ClientsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["clients", { page, q }],
    queryFn: async () => (await api.get("/clients", { params: { page, pageSize: 20, q } })).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => { toast.success("تم تعطيل الحساب"); qc.invalidateQueries({ queryKey: ["clients"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/clients", data),
    onSuccess: () => { toast.success("تم إنشاء العميل"); qc.invalidateQueries({ queryKey: ["clients"] }); setOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<ClientRow>[] = [
    { key: "name", header: "العميل", render: (r) => (
      <div className="min-w-0">
        <div className="font-semibold truncate">{r.user.name}</div>
        <div className="text-[11px] text-muted-foreground truncate" dir="ltr">{r.user.email}</div>
      </div>
    ) },
    { key: "company", header: "الشركة", render: (r) => <span className="text-sm">{r.companyName || "—"}</span> },
    { key: "phone", header: "الجوال", render: (r) => <span dir="ltr" className="text-sm">{r.phone || r.user.phone || "—"}</span> },
    { key: "city", header: "المدينة", render: (r) => r.city || "—" },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "created", header: "منذ", render: (r) => formatDate(r.createdAt), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog
          title="تعطيل حساب العميل"
          description="سيتم تعطيل الحساب ولن يستطيع تسجيل الدخول. يمكن إعادة تفعيله لاحقاً."
          onConfirm={() => del.mutateAsync(r.id)}
          trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>}
        />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader
        icon={Users}
        title="العملاء"
        description="إدارة عملاء الشركة وحساباتهم وشركاتهم."
        actions={
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> عميل جديد
          </Button>
        }
      />

      <DataTable<ClientRow>
        columns={columns}
        rows={list.data?.rows}
        loading={list.isLoading}
        total={list.data?.total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="بحث بالاسم أو البريد أو الشركة..."
        onRowClick={(r) => nav({ to: "/admin/clients/$id", params: { id: r.id } })}
        emptyTitle="لا يوجد عملاء بعد"
        emptyDescription="أضف عميلك الأول عبر الزر أعلاه."
      />

      <FormSheet
        open={open} onOpenChange={setOpen}
        title="إنشاء عميل جديد"
        description="سيتم إنشاء حساب دخول للعميل مع ملف الشركة."
        submitText="إنشاء"
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          const data = Object.fromEntries(fd.entries());
          await create.mutateAsync(data);
        }}
      >
        <ClientFormFields />
      </FormSheet>
    </>
  );
}

function ClientFormFields() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5"><Label>الاسم الكامل *</Label><Input name="name" required /></div>
      <div className="space-y-1.5"><Label>البريد الإلكتروني *</Label><Input dir="ltr" type="email" name="email" required /></div>
      <div className="space-y-1.5"><Label>كلمة السر *</Label><Input dir="ltr" type="password" name="password" required minLength={8} /></div>
      <div className="space-y-1.5"><Label>الجوال</Label><Input dir="ltr" name="phone" placeholder="+9665..." /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>اسم الشركة</Label><Input name="companyName" /></div>
      <div className="space-y-1.5"><Label>السجل التجاري</Label><Input name="commercialNumber" dir="ltr" /></div>
      <div className="space-y-1.5"><Label>الرقم الضريبي</Label><Input name="taxNumber" dir="ltr" /></div>
      <div className="space-y-1.5"><Label>المدينة</Label><Input name="city" /></div>
      <div className="space-y-1.5"><Label>الدولة</Label><Input name="country" defaultValue="SA" dir="ltr" /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>العنوان</Label><Input name="address" /></div>
    </div>
  );
}
