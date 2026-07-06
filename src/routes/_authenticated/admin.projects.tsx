import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FolderKanban, Plus, Trash2, Layers, Activity, CheckCircle2, AlertTriangle, Wallet, PauseCircle,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/admin/projects")({
  component: ProjectsPage,
});

type Row = {
  id: string; title: string; status: string; progress: number;
  budget?: string | null; dueDate?: string | null;
  client: { id: string; user: { name: string; email: string } };
};

type Stats = {
  total: number; active: number; completed: number; onHold: number; overdue: number;
  avgProgress: number; totalBudget: number;
};

function ProjectsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["projects", { page, q, status }],
    queryFn: async () => (await api.get("/projects", { params: { page, pageSize: 20, q, status } })).data,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const stats = list.data?.stats as Stats | undefined;
  const rows = (list.data?.rows ?? []) as Row[];
  const filtered = useMemo(
    () => (status ? rows.filter((r) => r.status === status) : rows),
    [rows, status],
  );

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["projects"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<Row>[] = [
    { key: "title", header: "المشروع", render: (r) => (
      <Link to="/admin/clients/$id" params={{ id: r.client.id }} className="min-w-0 block hover:text-electric">
        <div className="font-semibold truncate">{r.title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{r.client.user.name}</div>
      </Link>
    ) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "progress", header: "التقدم", render: (r) => (
      <div className="min-w-[110px]">
        <Progress value={r.progress} className="h-1.5" />
        <div className="text-[10px] text-muted-foreground mt-1">{r.progress}%</div>
      </div>
    ) },
    { key: "budget", header: "الميزانية", render: (r) => r.budget ? <Money value={r.budget} /> : "—", hideOnMobile: true },
    { key: "due", header: "الاستحقاق", render: (r) => formatDate(r.dueDate), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <div onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog title="حذف المشروع" description="سيتم حذف المشروع نهائياً."
          onConfirm={async () => { await del.mutateAsync(r.id); }}
          trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>}
        />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader
        icon={FolderKanban} title="المشاريع"
        description="متابعة جميع مشاريع العملاء، حالتها ونسب الإنجاز."
        actions={
          <Button onClick={() => navigate({ to: "/admin/projects" })} className="gap-2">
            <Plus className="h-4 w-4" />مشروع جديد
          </Button>
        }
      />

      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Layers, label: "إجمالي المشاريع", value: stats?.total ?? 0, accent: "electric", spark: [3,4,4,5,6,7] },
          { icon: Activity, label: "قيد التنفيذ", value: stats?.active ?? 0, accent: "cyan" },
          { icon: CheckCircle2, label: "مكتملة", value: stats?.completed ?? 0, accent: "emerald" },
          { icon: AlertTriangle, label: "متأخرة", value: stats?.overdue ?? 0, accent: "rose" },
          { icon: PauseCircle, label: "متوقفة", value: stats?.onHold ?? 0, accent: "amber" },
          { icon: Wallet, label: "إجمالي الميزانيات", value: <Money value={stats?.totalBudget ?? 0} />, accent: "purple", hint: `متوسط تقدم ${stats?.avgProgress ?? 0}%` },
        ]}
      />

      <FilterChips
        value={status}
        onChange={setStatus}
        chips={[
          { key: "", label: "الكل" },
          { key: "PLANNING", label: "تخطيط" },
          { key: "DESIGN", label: "تصميم" },
          { key: "DEVELOPMENT", label: "تطوير" },
          { key: "TESTING", label: "اختبار" },
          { key: "COMPLETED", label: "مكتمل" },
          { key: "ON_HOLD", label: "متوقف" },
        ]}
      />

      <DataTable<Row>
        columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        emptyTitle="لا توجد مشاريع بعد"
      />
    </>
  );
}
