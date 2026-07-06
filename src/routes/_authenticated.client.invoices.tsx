import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatSAR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/client/invoices")({
  component: () => {
    const [page, setPage] = useState(1);
    const list = useQuery({ queryKey: ["client-invoices", page], queryFn: async () => (await api.get("/invoices", { params: { page } })).data });
    const columns: Column<any>[] = [
      { key: "num", header: "الرقم", render: (r) => <span dir="ltr" className="font-mono text-sm">{r.invoiceNumber}</span> },
      { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
      { key: "total", header: "الإجمالي", render: (r) => <span className="font-bold">{formatSAR(r.total)}</span> },
      { key: "due", header: "الاستحقاق", render: (r) => formatDate(r.dueAt), hideOnMobile: true },
      { key: "actions", header: "", render: (r) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toast.info("قريباً — بوابة الدفع"); }}
          disabled={r.status === "PAID"}>{r.status === "PAID" ? "مدفوعة" : "ادفع الآن"}</Button>
      ) },
    ];
    return (
      <>
        <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-electric" /><h1 className="text-xl font-black">فواتيري</h1></div>
        <DataTable columns={columns} rows={list.data?.rows} loading={list.isLoading}
          total={list.data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="لا توجد فواتير" />
      </>
    );
  },
});
