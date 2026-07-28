import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Trash2, User, Calendar, Receipt, StickyNote } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/admin/payments/$id")({
  component: AdminPaymentDetail,
});

function AdminPaymentDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["payment", id],
    queryFn: async () => (await api.get(`/payments/${id}`)).data.payment,
    refetchInterval: 5000, refetchOnWindowFocus: true,
  });
  const p = q.data;
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");

  const patch = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.patch(`/payments/${id}`, d),
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["payment", id] }); qc.invalidateQueries({ queryKey: ["payments"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const del = useMutation({
    mutationFn: () => api.delete(`/payments/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["payments"] }); nav({ to: "/admin/payments" }); },
  });

  return (
    <DetailShell
      backTo="/admin/payments"
      icon={CreditCard}
      loading={q.isLoading}
      title={p ? <span className="font-mono" dir="ltr">#{p.id.slice(-8).toUpperCase()}</span> : "—"}
      subtitle={p ? `${p.client?.user?.name ?? ""} · ${p.method}` : undefined}
      status={p && <StatusBadge value={p.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
      actions={p && (
        <ConfirmDialog title="حذف الدفعة" onConfirm={async () => { await del.mutateAsync(); }}
          trigger={<Button size="icon" variant="ghost" className="text-rose-400"><Trash2 className="h-4 w-4" /></Button>} />
      )}
    >
      {q.isLoading || !p ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <DetailSection title="تفاصيل الدفعة" icon={CreditCard}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <KV k="المبلغ" v={<Money value={p.amount} className="text-electric font-black text-base" />} />
                <KV k="طريقة الدفع" v={p.method} />
                <KV k="العملة" v={p.currency} />
                <KV k="مرجع المعاملة" v={p.transactionRef} mono dir="ltr" />
                <KV k="تاريخ الدفع" v={formatDate(p.paidAt)} />
                <KV k="أُنشئت في" v={formatDate(p.createdAt)} />
              </div>
            </DetailSection>

            <DetailSection title="الفاتورة المرتبطة" icon={Receipt}>
              {p.invoice ? (
                <Link to="/admin/invoices/$id" params={{ id: p.invoice.id }} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-electric/40 transition">
                  <div>
                    <div className="font-mono font-bold" dir="ltr">{p.invoice.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground mt-0.5"><StatusBadge value={p.invoice.status} /></div>
                  </div>
                  <Money value={p.invoice.total} className="font-bold" />
                </Link>
              ) : <p className="text-xs text-muted-foreground text-center py-4">دفعة يدوية بدون فاتورة</p>}
            </DetailSection>
          </div>

          <div className="space-y-4">
            <DetailSection title="العميل" icon={User}>
              <KV k="الاسم" v={p.client?.user?.name} />
              <KV k="البريد" v={p.client?.user?.email} mono dir="ltr" />
              <KV k="الهاتف" v={p.client?.user?.phone} mono dir="ltr" />
            </DetailSection>

            <DetailSection title="تحكم الأدمن" icon={Calendar}>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">الحالة</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["PENDING", "SUCCESS", "FAILED", "REFUNDED"].map((s) => (
                      <Button key={s} size="sm" variant={p.status === s ? "default" : "outline"} className="h-7 text-xs" onClick={() => patch.mutate({ status: s })}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">المبلغ</label>
                  <Input type="number" step="0.01" defaultValue={p.amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">مرجع المعاملة</label>
                  <Input defaultValue={p.transactionRef ?? ""} onChange={(e) => setRef(e.target.value)} className="mt-1.5" dir="ltr" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70 flex items-center gap-1"><StickyNote className="h-3 w-3" /> ملاحظات</label>
                  <Textarea rows={3} defaultValue={p.notes ?? ""} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
                </div>
                <Button size="sm" className="w-full" onClick={() => patch.mutate({
                  amount: amount ? Number(amount) : undefined,
                  transactionRef: ref || undefined,
                  notes: notes || undefined,
                })}>حفظ التغييرات</Button>
              </div>
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
