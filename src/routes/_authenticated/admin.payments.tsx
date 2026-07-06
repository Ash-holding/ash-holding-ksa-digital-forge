import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2 } from "lucide-react";
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
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: PaymentsPage,
});

const METHOD_AR: Record<string, string> = { BANK_TRANSFER: "تحويل بنكي", PAYLINK: "Paylink", CASH: "نقدي", MANUAL: "يدوي" };

type Row = { id: string; amount: string; method: string; status: string; transactionRef?: string | null; paidAt?: string | null;
  client: { user: { name: string } }; invoice?: { invoiceNumber: string } | null };

function PaymentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const list = useQuery({ queryKey: ["payments", page], queryFn: async () => (await api.get("/payments", { params: { page } })).data });
  const clients = useQuery({ queryKey: ["clients-lite"], queryFn: async () => (await api.get("/clients", { params: { pageSize: 100 } })).data });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/payments", d),
    onSuccess: () => { toast.success("تم تسجيل الدفعة"); qc.invalidateQueries({ queryKey: ["payments"] }); setOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/payments/${id}`), onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["payments"] }); } });

  const columns: Column<Row>[] = [
    { key: "client", header: "العميل", render: (r) => r.client.user.name },
    { key: "amount", header: "المبلغ", render: (r) => <Money value={r.amount} className="font-bold" /> },
    { key: "method", header: "الطريقة", render: (r) => METHOD_AR[r.method] || r.method },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "ref", header: "مرجع", render: (r) => <span dir="ltr" className="text-xs">{r.transactionRef || "—"}</span>, hideOnMobile: true },
    { key: "date", header: "التاريخ", render: (r) => formatDate(r.paidAt || null), hideOnMobile: true },
    { key: "invoice", header: "الفاتورة", render: (r) => r.invoice?.invoiceNumber ? <span dir="ltr" className="text-xs">{r.invoice.invoiceNumber}</span> : "—" },
    { key: "actions", header: "", render: (r) => (
      <div onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog title="حذف الدفعة" onConfirm={async () => { await del.mutateAsync(r.id); }}
          trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>} />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader icon={CreditCard} title="المدفوعات" description="سجل الدفعات المستلمة من العملاء."
        actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />تسجيل دفعة</Button>} />
      <DataTable<Row> columns={columns} rows={list.data?.rows} loading={list.isLoading}
        total={list.data?.total} page={page} pageSize={20} onPageChange={setPage} />
      <FormSheet open={open} onOpenChange={setOpen} title="تسجيل دفعة" submitText="حفظ"
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
          await create.mutateAsync({ ...raw, amount: Number(raw.amount) });
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2"><Label>العميل *</Label>
            <select name="clientId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">اختر</option>
              {clients.data?.rows?.map((c: any) => <option key={c.id} value={c.id}>{c.user.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>المبلغ *</Label><Input type="number" step="0.01" name="amount" required /></div>
          <div className="space-y-1.5"><Label>الطريقة *</Label>
            <select name="method" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {Object.keys(METHOD_AR).map((k) => <option key={k} value={k}>{METHOD_AR[k]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>الحالة</Label>
            <select name="status" defaultValue="SUCCESS" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["PENDING","SUCCESS","FAILED","REFUNDED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>المرجع</Label><Input name="transactionRef" dir="ltr" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>ملاحظة</Label><Input name="notes" /></div>
        </div>
      </FormSheet>
    </>
  );
}
