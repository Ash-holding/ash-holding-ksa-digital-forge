import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ScrollText, Plus, Trash2, FileSignature, FileClock, FileEdit, Vault } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { FormSheet } from "@/components/dashboard/FormSheet";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/admin/contracts")({
  component: ContractsPage,
});

type Row = { id: string; contractNumber: string; title: string; status: string; value?: string | null; signedAt?: string | null; client: { user: { name: string } } };
type Stats = { total: number; signed: number; pending: number; draft: number; totalValue: number };

function ContractsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["contracts", page],
    queryFn: async () => (await api.get("/contracts", { params: { page } })).data,
    refetchInterval: 20000, refetchOnWindowFocus: true,
  });
  const clients = useQuery({ queryKey: ["clients-lite"], queryFn: async () => (await api.get("/clients", { params: { pageSize: 100 } })).data });

  const stats = list.data?.stats as Stats | undefined;
  const rows = (list.data?.rows ?? []) as Row[];
  const filtered = useMemo(() => (status ? rows.filter((r) => r.status === status) : rows), [rows, status]);

  const del = useMutation({ mutationFn: (id: string) => api.delete(`/contracts/${id}`), onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["contracts"] }); } });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/contracts", d),
    onSuccess: () => { toast.success("تم إنشاء العقد"); qc.invalidateQueries({ queryKey: ["contracts"] }); setOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<Row>[] = [
    { key: "num", header: "الرقم", render: (r) => <span dir="ltr" className="font-mono text-xs">{r.contractNumber}</span> },
    { key: "title", header: "العنوان", render: (r) => (
      <div className="min-w-0">
        <div className="font-semibold truncate">{r.title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{r.client.user.name}</div>
      </div>
    ) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "value", header: "القيمة", render: (r) => r.value ? <Money value={r.value} className="font-bold" /> : "—" },
    { key: "signed", header: "تاريخ التوقيع", render: (r) => formatDate(r.signedAt), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <div onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog title="حذف العقد" onConfirm={async () => { await del.mutateAsync(r.id); }}
          trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>} />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader icon={ScrollText} title="العقود" description="إدارة العقود وحالات التوقيع والمبالغ."
        actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />عقد جديد</Button>} />

      <AdminStatsRow loading={list.isLoading} stats={[
        { icon: ScrollText, label: "إجمالي العقود", value: stats?.total ?? 0, accent: "electric" },
        { icon: FileSignature, label: "موقّعة", value: stats?.signed ?? 0, accent: "emerald" },
        { icon: FileClock, label: "بانتظار التوقيع", value: stats?.pending ?? 0, accent: "amber" },
        { icon: FileEdit, label: "مسودات", value: stats?.draft ?? 0, accent: "cyan" },
        { icon: Vault, label: "قيمة العقود النشطة", value: <Money value={stats?.totalValue ?? 0} />, accent: "purple" },
      ]} />

      <FilterChips value={status} onChange={setStatus} chips={[
        { key: "", label: "الكل", count: stats?.total },
        { key: "SIGNED", label: "موقّع", count: stats?.signed },
        { key: "PENDING_SIGNATURE", label: "بانتظار التوقيع" },
        { key: "SENT", label: "مرسل" },
        { key: "DRAFT", label: "مسودة", count: stats?.draft },
      ]} />

      <DataTable<Row> columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        onRowClick={(r) => nav({ to: "/admin/contracts/", params: { id: r.id } })}
        emptyTitle="لا توجد عقود بعد" />

      <FormSheet open={open} onOpenChange={setOpen} title="عقد جديد" submitText="حفظ"
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
          await create.mutateAsync({ ...raw, value: raw.value ? Number(raw.value) : undefined });
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2"><Label>العميل *</Label>
            <select name="clientId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">اختر</option>
              {(clients.data?.rows ?? []).map((c: { id: string; user: { name: string } }) => <option key={c.id} value={c.id}>{c.user.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>عنوان العقد *</Label><Input name="title" required /></div>
          <div className="space-y-1.5"><Label>القيمة</Label><Input type="number" step="0.01" name="value" /></div>
          <div className="space-y-1.5"><Label>الحالة</Label>
            <select name="status" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["DRAFT","SENT","PENDING_SIGNATURE","SIGNED","CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>تاريخ البدء</Label><Input name="startsAt" type="date" /></div>
          <div className="space-y-1.5"><Label>تاريخ الانتهاء</Label><Input name="endsAt" type="date" /></div>
        </div>
      </FormSheet>
    </>
  );
}
