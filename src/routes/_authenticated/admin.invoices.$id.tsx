import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Download, CheckCircle, Trash2, User, Calendar, StickyNote, Receipt, CreditCard } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { formatDate } from "@/lib/format";
import { downloadInvoicePDF } from "@/lib/invoice-print";

export const Route = createFileRoute("/_authenticated/admin/invoices/$id")({
  component: AdminInvoiceDetail,
});

function AdminInvoiceDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => (await api.get(`/invoices/${id}`)).data.invoice,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const inv = q.data;
  const [notes, setNotes] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");

  const patch = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.patch(`/invoices/${id}`, d),
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const markPaid = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/mark-paid`),
    onSuccess: () => { toast.success("تم التحديد كمدفوعة"); qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });
  const del = useMutation({
    mutationFn: () => api.delete(`/invoices/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["invoices"] }); nav({ to: "/admin/invoices" }); },
  });

  const changeStatus = (status: string) => patch.mutate({ status });

  return (
    <DetailShell
      backTo="/admin/invoices"
      icon={FileText}
      loading={q.isLoading}
      title={inv ? <span className="font-mono" dir="ltr">{inv.invoiceNumber}</span> : "—"}
      subtitle={inv ? `${inv.client?.user?.name ?? ""} · ${formatDate(inv.issueDate || inv.createdAt)}` : undefined}
      status={inv && <StatusBadge value={inv.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
      actions={inv && (
        <>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadInvoicePDF(inv)}>
            <Download className="h-4 w-4" />PDF
          </Button>
          {inv.status !== "PAID" && inv.status !== "CANCELLED" && (
            <Button size="sm" className="gap-1.5" onClick={() => markPaid.mutate()}>
              <CheckCircle className="h-4 w-4" />تحديد كمدفوعة
            </Button>
          )}
          <ConfirmDialog title="حذف الفاتورة" onConfirm={async () => { await del.mutateAsync(); }}
            trigger={<Button size="icon" variant="ghost" className="text-rose-400"><Trash2 className="h-4 w-4" /></Button>} />
        </>
      )}
    >
      {q.isLoading || !inv ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 lg:col-span-2" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Bento */}
          <div className="lg:col-span-2 space-y-4">
            <DetailSection title="ملخص الفاتورة" icon={Receipt}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KV k="الإجمالي" v={<Money value={inv.total} className="text-electric font-black text-base" />} />
                <KV k="الفرعي" v={<Money value={inv.subtotal} />} />
                <KV k="الضريبة" v={<Money value={inv.taxAmount} />} />
                <KV k="الخصم" v={<Money value={inv.discount ?? 0} />} />
                <KV k="تاريخ الإصدار" v={formatDate(inv.issueDate || inv.createdAt)} />
                <KV k="الاستحقاق" v={formatDate(inv.dueAt)} />
                <KV k="المدفوع في" v={formatDate(inv.paidAt)} />
                <KV k="العملة" v={inv.currency} />
              </div>
            </DetailSection>

            <DetailSection title="البنود" icon={FileText}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] text-muted-foreground border-b border-border">
                    <tr><th className="text-right py-2">البند</th><th className="text-center">الكمية</th><th className="text-center">السعر</th><th className="text-left">الإجمالي</th></tr>
                  </thead>
                  <tbody>
                    {(inv.items ?? []).map((it: any) => (
                      <tr key={it.id} className="border-b border-border/40">
                        <td className="py-2">{it.title}</td>
                        <td className="text-center">{it.quantity}</td>
                        <td className="text-center"><Money value={it.unitPrice} /></td>
                        <td className="text-left font-semibold"><Money value={it.total} /></td>
                      </tr>
                    ))}
                    {(!inv.items || inv.items.length === 0) && (
                      <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">لا توجد بنود</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DetailSection>

            <DetailSection title="الدفعات المرتبطة" icon={CreditCard}>
              {(inv.payments ?? []).length ? (
                <div className="divide-y divide-border/50">
                  {inv.payments.map((p: any) => (
                    <div key={p.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-semibold"><Money value={p.amount} /></div>
                        <div className="text-[11px] text-muted-foreground">{p.method} · {formatDate(p.paidAt || p.createdAt)}</div>
                      </div>
                      <StatusBadge value={p.status} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground text-center py-4">لا توجد دفعات مرتبطة</p>}
            </DetailSection>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <DetailSection title="العميل" icon={User}>
              <KV k="الاسم" v={inv.client?.user?.name} />
              <KV k="البريد" v={inv.client?.user?.email} mono dir="ltr" />
              <KV k="الهاتف" v={inv.client?.user?.phone} mono dir="ltr" />
            </DetailSection>

            <DetailSection title="تحكم الأدمن" icon={Calendar}>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">تغيير الحالة</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["DRAFT", "UNPAID", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
                      <Button key={s} size="sm" variant={inv.status === s ? "default" : "outline"} className="h-7 text-xs" onClick={() => changeStatus(s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">تاريخ الاستحقاق</label>
                  <div className="flex gap-1.5 mt-1.5">
                    <Input type="date" defaultValue={inv.dueAt ? new Date(inv.dueAt).toISOString().slice(0, 10) : ""} onChange={(e) => setDueAt(e.target.value)} />
                    <Button size="sm" onClick={() => patch.mutate({ dueAt: dueAt || null })}>حفظ</Button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70 flex items-center gap-1"><StickyNote className="h-3 w-3" /> ملاحظات</label>
                  <Textarea rows={3} defaultValue={inv.notes ?? ""} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
                  <Button size="sm" className="mt-1.5 w-full" onClick={() => patch.mutate({ notes })}>حفظ الملاحظات</Button>
                </div>
              </div>
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
