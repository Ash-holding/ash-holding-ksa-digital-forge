import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Receipt, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/client/payments/$id")({
  component: ClientPaymentDetail,
});

function ClientPaymentDetail() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["client-payment", id],
    queryFn: async () => (await api.get(`/payments/${id}`)).data.payment,
    refetchInterval: 8000, refetchOnWindowFocus: true,
  });
  const p = q.data;

  return (
    <DetailShell
      backTo="/client/payments"
      icon={CreditCard}
      loading={q.isLoading}
      title={p ? <span className="font-mono" dir="ltr">إيصال #{p.id.slice(-8).toUpperCase()}</span> : "—"}
      subtitle={p?.method}
      status={p && <StatusBadge value={p.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
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

            {p.invoice && (
              <DetailSection title="الفاتورة المرتبطة" icon={Receipt}>
                <Link to="/client/invoices/$id" params={{ id: p.invoice.id }} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-electric/40 transition">
                  <div>
                    <div className="font-mono font-bold" dir="ltr">{p.invoice.invoiceNumber}</div>
                    <div className="text-xs mt-0.5"><StatusBadge value={p.invoice.status} /></div>
                  </div>
                  <Money value={p.invoice.total} className="font-bold" />
                </Link>
              </DetailSection>
            )}
          </div>

          <div className="space-y-4">
            <DetailSection title="الملاحظات" icon={Calendar}>
              <p className="text-xs whitespace-pre-wrap text-muted-foreground">{p.notes || "—"}</p>
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
