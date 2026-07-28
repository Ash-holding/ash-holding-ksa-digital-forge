import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Receipt, CreditCard, User, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { downloadInvoicePDF } from "@/lib/invoice-print";

export const Route = createFileRoute("/_authenticated/client/invoices/$id")({
  component: ClientInvoiceDetail,
});

function ClientInvoiceDetail() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["client-invoice", id],
    queryFn: async () => (await api.get(`/invoices/${id}`)).data.invoice,
    refetchInterval: 8000, refetchOnWindowFocus: true,
  });
  const inv = q.data;

  return (
    <DetailShell
      backTo="/client/invoices"
      icon={FileText}
      loading={q.isLoading}
      title={inv ? <span className="font-mono" dir="ltr">{inv.invoiceNumber}</span> : "—"}
      subtitle={inv ? `صادرة في ${formatDate(inv.issueDate || inv.createdAt)}` : undefined}
      status={inv && <StatusBadge value={inv.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
      actions={inv && (
        <Button size="sm" className="gap-1.5" onClick={() => downloadInvoicePDF(inv)}>
          <Download className="h-4 w-4" />تحميل PDF
        </Button>
      )}
    >
      {q.isLoading || !inv ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <DetailSection title="ملخص الفاتورة" icon={Receipt}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KV k="المبلغ الإجمالي" v={<Money value={inv.total} className="text-electric font-black text-base" />} />
                <KV k="المبلغ الفرعي" v={<Money value={inv.subtotal} />} />
                <KV k="الضريبة" v={<Money value={inv.taxAmount} />} />
                <KV k="الخصم" v={<Money value={inv.discount ?? 0} />} />
                <KV k="تاريخ الاستحقاق" v={formatDate(inv.dueAt)} />
                <KV k="تاريخ الدفع" v={formatDate(inv.paidAt)} />
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
                  </tbody>
                </table>
              </div>
            </DetailSection>

            <DetailSection title="سجل الدفعات" icon={CreditCard}>
              {(inv.payments ?? []).length ? (
                <div className="divide-y divide-border/50">
                  {inv.payments.map((p: any) => (
                    <div key={p.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                      <div>
                        <div className="font-semibold"><Money value={p.amount} /></div>
                        <div className="text-[11px] text-muted-foreground">{p.method} · {formatDate(p.paidAt || p.createdAt)}</div>
                      </div>
                      <StatusBadge value={p.status} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground text-center py-4">لم يتم تسجيل أي دفعات بعد</p>}
            </DetailSection>
          </div>

          <div className="space-y-4">
            <DetailSection title="الملاحظات" icon={Calendar}>
              <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {inv.notes || "لا توجد ملاحظات"}
              </p>
            </DetailSection>
            <DetailSection title="بيانات الإصدار" icon={User}>
              <KV k="جهة الإصدار" v="ASH HOLDING" />
              <KV k="المرجع" v={inv.invoiceNumber} mono dir="ltr" />
              <KV k="العملة" v={inv.currency} />
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
