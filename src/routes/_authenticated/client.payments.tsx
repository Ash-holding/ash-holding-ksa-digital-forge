import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

const METHOD_AR: Record<string, string> = { BANK_TRANSFER: "تحويل بنكي", PAYLINK: "Paylink", CASH: "نقدي", MANUAL: "يدوي" };

export const Route = createFileRoute("/_authenticated/client/payments")({
  component: () => {
    const [page, setPage] = useState(1);
    const list = useQuery({ queryKey: ["client-payments", page], queryFn: async () => (await api.get("/payments", { params: { page } })).data });
    const columns: Column<any>[] = [
      { key: "amount", header: "المبلغ", render: (r) => <Money value={r.amount} className="font-bold" /> },
      { key: "method", header: "الطريقة", render: (r) => METHOD_AR[r.method] || r.method },
      { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
      { key: "invoice", header: "الفاتورة", render: (r) => r.invoice ? <span dir="ltr" className="text-xs font-mono">{r.invoice.invoiceNumber}</span> : "—" },
      { key: "date", header: "التاريخ", render: (r) => formatDate(r.paidAt || r.createdAt), hideOnMobile: true },
    ];
    return (
      <>
        <div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-electric" /><h1 className="text-xl font-black">مدفوعاتي</h1></div>
        <DataTable columns={columns} rows={list.data?.rows} loading={list.isLoading}
          total={list.data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="لا توجد مدفوعات" />
      </>
    );
  },
});
