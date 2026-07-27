import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ScrollText, Signature, FileSignature, CheckCircle2, Clock, Wallet, Layers,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/client/contracts")({
  component: ClientContractsPage,
});

function ClientContractsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["client-contracts", page],
    queryFn: async () => (await api.get("/contracts", { params: { page } })).data,
    refetchInterval: 20000,
  });
  const sign = useMutation({
    mutationFn: (id: string) => api.post(`/contracts/${id}/request-sign`),
    onSuccess: () => { toast.success("تم إرسال طلب التوقيع"); qc.invalidateQueries({ queryKey: ["client-contracts"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = useMemo(() => {
    const total = rows.length;
    const signed = rows.filter((r) => r.status === "SIGNED").length;
    const pending = rows.filter((r) => r.status === "SENT" || r.status === "DRAFT").length;
    const totalValue = rows.reduce((s, r) => s + Number(r.value ?? 0), 0);
    return { total, signed, pending, totalValue };
  }, [rows]);

  const filtered = useMemo(() => (status ? rows.filter((r) => r.status === status) : rows), [rows, status]);

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
    <div className="space-y-3">
      <ClientPageHeader
        icon={ScrollText}
        title="عقودي"
        description="جميع العقود، حالتها، وقيمها."
      />
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Layers, label: "إجمالي العقود", value: stats.total, accent: "electric" },
          { icon: CheckCircle2, label: "موقّعة", value: stats.signed, accent: "emerald" },
          { icon: Clock, label: "بانتظار التوقيع", value: stats.pending, accent: "amber" },
          { icon: Wallet, label: "إجمالي القيمة", value: <Money value={stats.totalValue} />, accent: "purple" },
          { icon: FileSignature, label: "نسبة التوقيع", value: `${stats.total ? Math.round((stats.signed / stats.total) * 100) : 0}%`, accent: "cyan" },
        ]}
      />
      <FilterChips
        value={status} onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: stats.total },
          { key: "DRAFT", label: "مسودة" },
          { key: "SENT", label: "مرسل" },
          { key: "SIGNED", label: "موقّع", count: stats.signed },
          { key: "EXPIRED", label: "منتهي" },
        ]}
      />
      <DataTable
        columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        emptyTitle="لا توجد عقود"
      />
    </div>
  );
}
