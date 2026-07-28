import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Inbox, Clock, Sparkles, CheckCircle2, AlertTriangle, Zap,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { LiveBadge } from "@/components/client/LiveBadge";

export const Route = createFileRoute("/_authenticated/admin/project-requests/")({
  component: ProjectRequestsPage,
});


function ProjectRequestsPage() {
  const [status, setStatus] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["project-requests", status],
    queryFn: async () => (await api.get("/projects/requests/list", { params: { status: status ?? undefined, pageSize: 100 } })).data,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    retry: 1,
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = list.data?.stats ?? { total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0, urgent: 0, last24h: 0 };

  const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
    { key: "PENDING", label: "قيد الانتظار", statuses: ["PENDING"] },
    { key: "UNDER_REVIEW", label: "قيد الدراسة", statuses: ["UNDER_REVIEW"] },
    { key: "PROPOSAL", label: "قيد العرض/التعديل", statuses: ["PROPOSAL_SENT", "CLIENT_REVISION", "AWAITING_SIGNATURE"] },
    { key: "SIGNED", label: "موقّع / قيد التنفيذ", statuses: ["SIGNED", "IN_PROGRESS", "DELIVERED"] },
    { key: "APPROVED", label: "مقبولة", statuses: ["APPROVED"] },
    { key: "CONVERTED", label: "محوّلة/مكتملة", statuses: ["CONVERTED", "COMPLETED"] },
    { key: "REJECTED", label: "مرفوضة", statuses: ["REJECTED"] },
  ];

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    COLUMNS.forEach((c) => (g[c.key] = []));
    rows.forEach((r) => {
      const col = COLUMNS.find((c) => c.statuses.includes(r.status));
      (g[col?.key ?? "PENDING"] ??= []).push(r);
    });
    return g;
  }, [rows]);


  return (
    <>
      <PageHeader
        icon={Inbox} title="طلبات المشاريع"
        description="طلبات جديدة من العملاء — راجع، اعتمد، وحوّلها لمشاريع فعلية بضغطة واحدة."
        actions={<LiveBadge interval={8} />}
      />

      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Inbox, label: "إجمالي الطلبات", value: stats.total, accent: "electric" },
          { icon: Clock, label: "قيد الانتظار", value: stats.pending, accent: "amber" },
          { icon: Sparkles, label: "قيد الدراسة", value: stats.underReview, accent: "cyan" },
          { icon: CheckCircle2, label: "مقبولة/محوّلة", value: stats.approved, accent: "emerald" },
          { icon: AlertTriangle, label: "مرفوضة", value: stats.rejected, accent: "rose" },
          { icon: Zap, label: "عاجلة", value: stats.urgent, accent: "purple", hint: `آخر 24س: ${stats.last24h}` },
        ]}
      />

      <FilterChips
        value={status} onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: stats.total },
          { key: "PENDING", label: "قيد الانتظار", count: stats.pending },
          { key: "UNDER_REVIEW", label: "قيد الدراسة", count: stats.underReview },
          { key: "PROPOSAL_SENT", label: "عرض مُرسَل" },
          { key: "AWAITING_SIGNATURE", label: "بانتظار التوقيع" },
          { key: "SIGNED", label: "موقّع" },
          { key: "IN_PROGRESS", label: "قيد التنفيذ" },
          { key: "APPROVED", label: "مقبولة" },
          { key: "CONVERTED", label: "محوّلة" },
          { key: "COMPLETED", label: "مكتملة" },
          { key: "REJECTED", label: "مرفوضة", count: stats.rejected },
        ]}
      />

      {list.isError && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-[12px] text-rose-200">
          تعذّر تحميل طلبات المشاريع: {apiError(list.error)}
          <Button size="sm" variant="outline" className="ms-2 h-7" onClick={() => list.refetch()}>إعادة المحاولة</Button>
        </div>
      )}
      {!list.isLoading && !list.isError && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-[12px] text-muted-foreground">
          لا توجد طلبات مطابقة. إن كان العميل قد أرسل طلبًا للتو، اضغط تحديث.
          <Button size="sm" variant="outline" className="ms-2 h-7" onClick={() => list.refetch()}>تحديث الآن</Button>
        </div>
      )}


      {/* Kanban */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-2xl border border-border bg-card/50 p-2.5 min-h-[200px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold">{col.label}</span>
              <span className="text-[10px] text-muted-foreground">{grouped[col.key]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(grouped[col.key] ?? []).map((r) => (
                <Link
                  key={r.id}
                  to="/admin/project-requests/$id"
                  params={{ id: r.id }}
                  className="block w-full text-right rounded-xl border border-border bg-background p-2.5 hover:border-electric/40 hover:shadow-md transition group"
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <div className="font-bold text-[12px] truncate flex-1 group-hover:text-electric">{r.title}</div>
                    <StatusBadge value={r.priority} />
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mb-1">
                    {r.client?.user?.name ?? "—"} · {r.category}
                  </div>
                  <div className="mb-1.5"><StatusBadge value={r.status} /></div>
                  {(r.budgetMin || r.budgetMax) && (
                    <div className="text-[10px] font-bold">
                      {r.budgetMin ? Number(r.budgetMin).toLocaleString("ar-SA") : "—"} – {r.budgetMax ? Number(r.budgetMax).toLocaleString("ar-SA") : "—"} ر.س
                    </div>
                  )}
                  <div className="text-[9px] text-muted-foreground mt-1">{formatDate(r.createdAt)}</div>
                </Link>
              ))}
              {(grouped[col.key] ?? []).length === 0 && (
                <div className="rounded-xl border border-dashed border-border py-6 text-center text-[10px] text-muted-foreground">لا يوجد</div>
              )}
            </div>
          </div>
        ))}
      </div>

    </>
  );
}

