import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ScrollText, Signature } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/client/contracts")({
  component: () => {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const list = useQuery({ queryKey: ["client-contracts", page], queryFn: async () => (await api.get("/contracts", { params: { page } })).data });
    const sign = useMutation({
      mutationFn: (id: string) => api.post(`/contracts/${id}/request-sign`),
      onSuccess: () => { toast.success("تم إرسال طلب التوقيع"); qc.invalidateQueries({ queryKey: ["client-contracts"] }); },
      onError: (e) => toast.error(apiError(e)),
    });
    const columns: Column<any>[] = [
      { key: "num", header: "الرقم", render: (r) => <span dir="ltr" className="font-mono text-xs">{r.contractNumber}</span> },
      { key: "title", header: "العنوان", render: (r) => <span className="font-semibold">{r.title}</span> },
      { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
      { key: "value", header: "القيمة", render: (r) => r.value ? <Money value={r.value} /> : "—" },
      { key: "signed", header: "تاريخ التوقيع", render: (r) => formatDate(r.signedAt), hideOnMobile: true },
      { key: "actions", header: "", render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          {r.status === "SENT" || r.status === "DRAFT" ? (
            <ConfirmDialog variant="default" title="طلب التوقيع" description="سيتم إعلام الفريق باستعدادك للتوقيع."
              onConfirm={async () => { await sign.mutateAsync(r.id); }}
              trigger={<Button size="sm" variant="ghost" className="gap-1 text-electric"><Signature className="h-4 w-4" />وقّع</Button>} />
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </div>
      ) },
    ];
    return (
      <>
        <div className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-electric" /><h1 className="text-xl font-black">عقودي</h1></div>
        <DataTable columns={columns} rows={list.data?.rows} loading={list.isLoading}
          total={list.data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="لا توجد عقود" />
      </>
    );
  },
});
