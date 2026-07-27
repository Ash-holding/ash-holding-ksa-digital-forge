import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileText, Receipt, Wallet, Clock, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/client/invoices")({
  component: ClientInvoicesPage,
});

function ClientInvoicesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["client-invoices", page],
    queryFn: async () => (await api.get("/invoices", { params: { page } })).data,
    refetchInterval: 15000,
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = useMemo(() => {
    const total = rows.length;
    const paid = rows.filter((r) => r.status === "PAID").length;
    const unpaid = rows.filter((r) => r.status !== "PAID" && r.status !== "CANCELLED").length;
    const now = Date.now();
    const overdue = rows.filter((r) => r.status !== "PAID" && r.dueAt && new Date(r.dueAt).getTime() < now).length;
    const totalPaid = rows.filter((r) => r.status === "PAID").reduce((s, r) => s + Number(r.total ?? 0), 0);
    const totalDue = rows.filter((r) => r.status !== "PAID" && r.status !== "CANCELLED").reduce((s, r) => s + Number(r.total ?? 0), 0);
    return { total, paid, unpaid, overdue, totalPaid, totalDue };
  }, [rows]);

  const filtered = useMemo(() => (status ? rows.filter((r) => r.status === status) : rows), [rows, status]);

  const columns: Column<any>[] = [
    { key: "num", header: "الرقم", render: (r) => <span dir="ltr" className="font-mono text-sm">{r.invoiceNumber}</span> },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "total", header: "الإجمالي", render: (r) => <Money value={r.total} className="font-bold" /> },
    { key: "due", header: "الاستحقاق", render: (r) => formatDate(r.dueAt), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toast.info("قريباً — بوابة الدفع"); }}
        disabled={r.status === "PAID"}>{r.status === "PAID" ? "مدفوعة" : "ادفع الآن"}</Button>
    ) },
  ];

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={FileText}
        title="فواتيري"
        description="متابعة جميع فواتيرك بالحالة ومواعيد الاستحقاق."
      />
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Receipt, label: "إجمالي الفواتير", value: stats.total, accent: "electric" },
          { icon: CheckCircle2, label: "مدفوعة", value: stats.paid, accent: "emerald" },
          { icon: Clock, label: "غير مدفوعة", value: stats.unpaid, accent: "amber" },
          { icon: AlertTriangle, label: "متأخرة", value: stats.overdue, accent: "rose" },
          { icon: Wallet, label: "إجمالي المدفوع", value: <Money value={stats.totalPaid} />, accent: "emerald" },
          { icon: Wallet, label: "المستحق عليك", value: <Money value={stats.totalDue} />, accent: "purple" },
        ]}
      />
      <FilterChips
        value={status} onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: stats.total },
          { key: "SENT", label: "مرسلة" },
          { key: "PAID", label: "مدفوعة", count: stats.paid },
          { key: "OVERDUE", label: "متأخرة" },
          { key: "CANCELLED", label: "ملغاة" },
        ]}
      />
      <DataTable
        columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        emptyTitle="لا توجد فواتير"
      />
    </div>
  );
}
