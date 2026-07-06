import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2, CheckCircle } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { FormSheet } from "@/components/dashboard/FormSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSAR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/invoices")({
  component: InvoicesPage,
});

type Row = { id: string; invoiceNumber: string; status: string; total: string; dueAt?: string | null;
  client: { user: { name: string } }; project?: { title: string } | null };

type Item = { title: string; quantity: number; unitPrice: number };

function InvoicesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([{ title: "", quantity: 1, unitPrice: 0 }]);
  const [taxRate, setTaxRate] = useState(15);
  const [discount, setDiscount] = useState(0);

  const list = useQuery({ queryKey: ["invoices", page], queryFn: async () => (await api.get("/invoices", { params: { page } })).data });
  const clients = useQuery({ queryKey: ["clients-lite"], queryFn: async () => (await api.get("/clients", { params: { pageSize: 100 } })).data });

  const del = useMutation({ mutationFn: (id: string) => api.delete(`/invoices/${id}`), onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["invoices"] }); } });
  const markPaid = useMutation({ mutationFn: (id: string) => api.post(`/invoices/${id}/mark-paid`), onSuccess: () => { toast.success("تم تحديد كمدفوعة"); qc.invalidateQueries({ queryKey: ["invoices"] }); } });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/invoices", d),
    onSuccess: () => { toast.success("تم إنشاء الفاتورة"); qc.invalidateQueries({ queryKey: ["invoices"] }); setOpen(false); setItems([{ title: "", quantity: 1, unitPrice: 0 }]); },
    onError: (e) => toast.error(apiError(e)),
  });

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = +(taxable * (taxRate / 100)).toFixed(2);
  const total = +(taxable + tax).toFixed(2);

  const columns: Column<Row>[] = [
    { key: "number", header: "الرقم", render: (r) => <span dir="ltr" className="font-mono text-sm">{r.invoiceNumber}</span> },
    { key: "client", header: "العميل", render: (r) => r.client.user.name },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "total", header: "الإجمالي", render: (r) => <span className="font-bold">{formatSAR(r.total)}</span> },
    { key: "due", header: "الاستحقاق", render: (r) => formatDate(r.dueAt), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {r.status !== "PAID" && r.status !== "CANCELLED" && (
          <ConfirmDialog title="تحديد كمدفوعة؟" variant="default" confirmText="نعم"
            onConfirm={async () => { await markPaid.mutateAsync(r.id); }}
            trigger={<Button size="sm" variant="ghost" className="text-emerald-400 h-8 w-8 p-0"><CheckCircle className="h-4 w-4" /></Button>}
          />
        )}
        <ConfirmDialog title="حذف الفاتورة" onConfirm={async () => { await del.mutateAsync(r.id); }}
          trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>} />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader icon={FileText} title="الفواتير" description="إدارة الفواتير والضريبة والدفع."
        actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />فاتورة جديدة</Button>} />
      <DataTable<Row> columns={columns} rows={list.data?.rows} loading={list.isLoading}
        total={list.data?.total} page={page} pageSize={20} onPageChange={setPage} />
      <FormSheet open={open} onOpenChange={setOpen} title="فاتورة جديدة" submitText="إصدار الفاتورة"
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
          if (items.some((i) => !i.title || i.quantity <= 0)) { toast.error("أكمل البنود"); return; }
          await create.mutateAsync({
            clientId: raw.clientId, projectId: raw.projectId || undefined,
            discount, taxRate,
            dueAt: raw.dueAt || undefined, notes: raw.notes || undefined,
            items,
          });
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>العميل *</Label>
            <select name="clientId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">اختر</option>
              {clients.data?.rows?.map((c: any) => <option key={c.id} value={c.id}>{c.user.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>تاريخ الاستحقاق</Label><Input name="dueAt" type="date" /></div>

          <div className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">البنود</div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setItems([...items, { title: "", quantity: 1, unitPrice: 0 }])}>+ بند</Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-6" placeholder="الوصف" value={it.title}
                  onChange={(e) => setItems(items.map((i, k) => k === idx ? { ...i, title: e.target.value } : i))} />
                <Input className="col-span-2" type="number" min={1} value={it.quantity}
                  onChange={(e) => setItems(items.map((i, k) => k === idx ? { ...i, quantity: Number(e.target.value) } : i))} />
                <Input className="col-span-3" type="number" step="0.01" placeholder="السعر" value={it.unitPrice}
                  onChange={(e) => setItems(items.map((i, k) => k === idx ? { ...i, unitPrice: Number(e.target.value) } : i))} />
                <button type="button" className="col-span-1 text-rose-400" onClick={() => setItems(items.filter((_, k) => k !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>الخصم</Label><Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>نسبة الضريبة %</Label><Input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} /></div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{formatSAR(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">الضريبة ({taxRate}%)</span><span>{formatSAR(tax)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>الإجمالي</span><span>{formatSAR(total)}</span></div>
          </div>
        </div>
      </FormSheet>
    </>
  );
}
