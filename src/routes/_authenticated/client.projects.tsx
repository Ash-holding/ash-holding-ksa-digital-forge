import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  FolderKanban, Layers, Activity, CheckCircle2, PauseCircle, AlertTriangle, Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/client/projects")({
  component: ClientProjectsPage,
});

function ClientProjectsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["client-projects", page],
    queryFn: async () => (await api.get("/projects", { params: { page } })).data,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => ["PLANNING", "DESIGN", "DEVELOPMENT", "TESTING", "WAITING_CLIENT", "NEW"].includes(r.status)).length;
    const completed = rows.filter((r) => r.status === "COMPLETED").length;
    const onHold = rows.filter((r) => r.status === "ON_HOLD").length;
    const now = Date.now();
    const overdue = rows.filter((r) => r.dueDate && new Date(r.dueDate).getTime() < now && r.status !== "COMPLETED").length;
    const avg = total ? Math.round(rows.reduce((s, r) => s + (r.progress ?? 0), 0) / total) : 0;
    const totalBudget = rows.reduce((s, r) => s + Number(r.budget ?? 0), 0);
    return { total, active, completed, onHold, overdue, avg, totalBudget };
  }, [rows]);

  const filtered = useMemo(() => (status ? rows.filter((r) => r.status === status) : rows), [rows, status]);

  const columns: Column<any>[] = [
    { key: "title", header: "المشروع", render: (r) => <div className="font-semibold truncate">{r.title}</div> },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "progress", header: "التقدم", render: (r) => (
      <div className="min-w-[110px]">
        <Progress value={r.progress} className="h-1.5" />
        <div className="text-[10px] text-muted-foreground mt-1">{r.progress}%</div>
      </div>
    ) },
    { key: "budget", header: "الميزانية", render: (r) => r.budget ? <Money value={r.budget} /> : "—", hideOnMobile: true },
    { key: "due", header: "الاستحقاق", render: (r) => formatDate(r.dueDate), hideOnMobile: true },
  ];

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={FolderKanban}
        title="مشاريعي"
        description="متابعة حية لمشاريعك، حالتها ونسب الإنجاز — تحديث تلقائي كل 15 ثانية."
      />
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Layers, label: "إجمالي المشاريع", value: stats.total, accent: "electric" },
          { icon: Activity, label: "قيد التنفيذ", value: stats.active, accent: "cyan" },
          { icon: CheckCircle2, label: "مكتملة", value: stats.completed, accent: "emerald" },
          { icon: AlertTriangle, label: "متأخرة", value: stats.overdue, accent: "rose" },
          { icon: PauseCircle, label: "متوقفة", value: stats.onHold, accent: "amber" },
          { icon: Wallet, label: "إجمالي الميزانيات", value: <Money value={stats.totalBudget} />, accent: "purple", hint: `متوسط تقدم ${stats.avg}%` },
        ]}
      />
      <FilterChips
        value={status} onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: stats.total },
          { key: "PLANNING", label: "تخطيط" },
          { key: "DESIGN", label: "تصميم" },
          { key: "DEVELOPMENT", label: "تطوير" },
          { key: "TESTING", label: "اختبار" },
          { key: "COMPLETED", label: "مكتمل", count: stats.completed },
          { key: "ON_HOLD", label: "متوقف", count: stats.onHold },
        ]}
      />
      <DataTable
        columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        emptyTitle="لا توجد مشاريع بعد"
      />
    </div>
  );
}
