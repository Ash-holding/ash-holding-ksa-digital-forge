import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, Plus, Trash2, PackageCheck, PackageX, Clock, DollarSign } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge, statusLabel } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { FormSheet } from "@/components/dashboard/FormSheet";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/admin/services")({
  component: ServicesPage,
});

const TYPES = ["WEBSITE","MOBILE_APP","ADMIN_SYSTEM","HOSTING","VPS","DEDICATED_SERVER","SMTP","MARKETING","DESIGN","SUPPORT","OTHER"];
const TYPE_AR: Record<string, string> = { WEBSITE:"موقع", MOBILE_APP:"تطبيق جوال", ADMIN_SYSTEM:"نظام إداري", HOSTING:"استضافة", VPS:"VPS", DEDICATED_SERVER:"سيرفر مخصص", SMTP:"SMTP", MARKETING:"تسويق", DESIGN:"تصميم", SUPPORT:"دعم", OTHER:"أخرى" };

type Row = { id: string; name: string; type: string; status: string; price?: string | null; renewalDate?: string | null; client: { user: { name: string } }; project?: { title: string } | null };
type Stats = { total: number; active: number; awaiting: number; expired: number; monthlyRecurring: number };

function ServicesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["services", page],
    queryFn: async () => (await api.get("/services", { params: { page } })).data,
    refetchInterval: 20000, refetchOnWindowFocus: true,
  });
  const clients = useQuery({ queryKey: ["clients-lite"], queryFn: async () => (await api.get("/clients", { params: { pageSize: 100 } })).data });

  const stats = list.data?.stats as Stats | undefined;
  const rows = (list.data?.rows ?? []) as Row[];
  const filtered = useMemo(() => (status ? rows.filter((r) => r.status === status) : rows), [rows, status]);

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/services", d),
    onSuccess: () => { toast.success("تمت الإضافة"); qc.invalidateQueries({ queryKey: ["services"] }); setOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<Row>[] = [
    { key: "name", header: "الخدمة", render: (r) => (
      <div className="min-w-0">
        <div className="font-semibold truncate">{r.name}</div>
        <div className="text-[11px] text-muted-foreground truncate">{r.client.user.name}</div>
      </div>
    ) },
    { key: "type", header: "النوع", render: (r) => <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs">{TYPE_AR[r.type] || r.type}</span> },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "price", header: "السعر", render: (r) => r.price ? <Money value={r.price} className="font-bold" /> : "—" },
    { key: "renewal", header: "التجديد", render: (r) => formatDate(r.renewalDate), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <div onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog title="حذف الخدمة" onConfirm={async () => { await del.mutateAsync(r.id); }}
          trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>} />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader icon={Boxes} title="الخدمات" description="خدمات العملاء الفعّالة والمنتهية وتواريخ التجديد."
        actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />إضافة خدمة</Button>}
      />

      <AdminStatsRow loading={list.isLoading} stats={[
        { icon: Boxes, label: "إجمالي الخدمات", value: stats?.total ?? 0, accent: "electric" },
        { icon: PackageCheck, label: "نشطة", value: stats?.active ?? 0, accent: "emerald" },
        { icon: Clock, label: "بانتظار الدفع", value: stats?.awaiting ?? 0, accent: "amber" },
        { icon: PackageX, label: "منتهية / موقوفة", value: stats?.expired ?? 0, accent: "rose" },
        { icon: DollarSign, label: "إيراد متكرر", value: <Money value={stats?.monthlyRecurring ?? 0} />, accent: "purple", hint: "شهري تقديري" },
      ]} />

      <FilterChips value={status} onChange={setStatus} chips={[
        { key: "", label: "الكل", count: stats?.total },
        { key: "ACTIVE", label: "نشطة", count: stats?.active },
        { key: "AWAITING_PAYMENT", label: "بانتظار الدفع", count: stats?.awaiting },
        { key: "SUSPENDED", label: "موقوفة" },
        { key: "EXPIRED", label: "منتهية" },
      ]} />

      <DataTable<Row> columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        emptyTitle="لا توجد خدمات بعد" />

      <FormSheet open={open} onOpenChange={setOpen} title="إضافة خدمة" submitText="حفظ"
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          const raw = Object.fromEntries(fd.entries());
          await create.mutateAsync({ ...raw, price: raw.price ? Number(raw.price) : undefined });
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2"><Label>العميل *</Label>
            <select name="clientId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">اختر</option>
              {(clients.data?.rows ?? []).map((c: { id: string; user: { name: string } }) => <option key={c.id} value={c.id}>{c.user.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>اسم الخدمة *</Label><Input name="name" required /></div>
          <div className="space-y-1.5"><Label>النوع</Label>
            <select name="type" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_AR[t]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>الحالة</Label>
            <select name="status" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["ACTIVE","SUSPENDED","AWAITING_PAYMENT","EXPIRED"].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>السعر</Label><Input type="number" step="0.01" name="price" /></div>
          <div className="space-y-1.5"><Label>تاريخ التجديد</Label><Input name="renewalDate" type="date" /></div>
        </div>
      </FormSheet>
    </>
  );
}
