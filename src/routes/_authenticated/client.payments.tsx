import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CreditCard, CheckCircle2, Clock, XCircle, Wallet, Landmark } from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

const METHOD_AR: Record<string, string> = { BANK_TRANSFER: "تحويل بنكي", PAYLINK: "Paylink", CASH: "نقدي", MANUAL: "يدوي" };

export const Route = createFileRoute("/_authenticated/client/payments")({
  component: ClientPaymentsPage,
});

function ClientPaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["client-payments", page],
    queryFn: async () => (await api.get("/payments", { params: { page } })).data,
    refetchInterval: 15000,
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = useMemo(() => {
    const total = rows.length;
    const paid = rows.filter((r) => r.status === "PAID" || r.status === "COMPLETED").length;
    const pending = rows.filter((r) => r.status === "PENDING").length;
    const failed = rows.filter((r) => r.status === "FAILED" || r.status === "REJECTED").length;
    const paidTotal = rows.filter((r) => r.status === "PAID" || r.status === "COMPLETED").reduce((s, r) => s + Number(r.amount ?? 0), 0);
    return { total, paid, pending, failed, paidTotal };
  }, [rows]);

  const filtered = useMemo(() => (status ? rows.filter((r) => r.status === status) : rows), [rows, status]);

  const columns: Column<any>[] = [
    { key: "amount", header: "المبلغ", render: (r) => <Money value={r.amount} className="font-bold" /> },
    { key: "method", header: "الطريقة", render: (r) => METHOD_AR[r.method] || r.method },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "invoice", header: "الفاتورة", render: (r) => r.invoice ? <span dir="ltr" className="text-xs font-mono">{r.invoice.invoiceNumber}</span> : "—" },
    { key: "date", header: "التاريخ", render: (r) => formatDate(r.paidAt || r.createdAt), hideOnMobile: true },
  ];

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={CreditCard}
        title="مدفوعاتي"
        description="سجل كامل بجميع المدفوعات وطرقها."
      />
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Landmark, label: "إجمالي العمليات", value: stats.total, accent: "electric" },
          { icon: CheckCircle2, label: "ناجحة", value: stats.paid, accent: "emerald" },
          { icon: Clock, label: "معلّقة", value: stats.pending, accent: "amber" },
          { icon: XCircle, label: "فاشلة", value: stats.failed, accent: "rose" },
          { icon: Wallet, label: "إجمالي المدفوع", value: <Money value={stats.paidTotal} />, accent: "purple" },
        ]}
      />
      <FilterChips
        value={status} onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: stats.total },
          { key: "PAID", label: "ناجحة", count: stats.paid },
          { key: "PENDING", label: "معلّقة", count: stats.pending },
          { key: "FAILED", label: "فاشلة", count: stats.failed },
        ]}
      />
      <DataTable
        columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        emptyTitle="لا توجد مدفوعات"
      />
    </div>
  );
}
