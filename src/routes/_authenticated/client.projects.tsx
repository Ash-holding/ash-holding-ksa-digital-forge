import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  FolderKanban, Layers, Activity, CheckCircle2, PauseCircle, AlertTriangle, Wallet,
  Search, LayoutGrid, List, TrendingUp, Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { LiveBadge, DueBadge } from "@/components/client/LiveBadge";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client/projects")({
  component: ClientProjectsPage,
});

type SortKey = "recent" | "due" | "progress" | "budget";

function ClientProjectsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const [sort, setSort] = useState<SortKey>("recent");

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
    const dueSoon = rows.filter((r) => r.dueDate && r.status !== "COMPLETED" && new Date(r.dueDate).getTime() - now < 7 * 86400000 && new Date(r.dueDate).getTime() >= now).length;
    const avg = total ? Math.round(rows.reduce((s, r) => s + (r.progress ?? 0), 0) / total) : 0;
    const totalBudget = rows.reduce((s, r) => s + Number(r.budget ?? 0), 0);
    return { total, active, completed, onHold, overdue, dueSoon, avg, totalBudget };
  }, [rows]);

  const filtered = useMemo(() => {
    let out = status ? rows.filter((r) => r.status === status) : rows;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      out = out.filter((r) => (r.title || "").toLowerCase().includes(s) || (r.description || "").toLowerCase().includes(s));
    }
    const sorted = [...out];
    if (sort === "due") sorted.sort((a, b) => (new Date(a.dueDate || 0).getTime()) - (new Date(b.dueDate || 0).getTime()));
    else if (sort === "progress") sorted.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    else if (sort === "budget") sorted.sort((a, b) => Number(b.budget ?? 0) - Number(a.budget ?? 0));
    else sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    return sorted;
  }, [rows, status, q, sort]);

  const columns: Column<any>[] = [
    { key: "title", header: "المشروع", render: (r) => (
      <div className="min-w-0">
        <div className="font-semibold truncate">{r.title}</div>
        {r.dueDate && r.status !== "COMPLETED" && (
          <div className="mt-0.5 md:hidden"><DueBadge date={r.dueDate} /></div>
        )}
      </div>
    ) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "progress", header: "التقدم", render: (r) => (
      <div className="min-w-[110px]">
        <div className="flex items-center justify-between text-[10px] mb-0.5">
          <span className="text-muted-foreground">تقدم</span>
          <span className="font-bold">{r.progress}%</span>
        </div>
        <Progress value={r.progress} className="h-1.5" />
      </div>
    ) },
    { key: "budget", header: "الميزانية", render: (r) => r.budget ? <Money value={r.budget} /> : "—", hideOnMobile: true },
    { key: "due", header: "الاستحقاق", render: (r) => (
      <div className="flex flex-col gap-1">
        <span className="text-[11px]">{formatDate(r.dueDate)}</span>
        {r.dueDate && r.status !== "COMPLETED" && <DueBadge date={r.dueDate} />}
      </div>
    ), hideOnMobile: true },
  ];

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={FolderKanban}
        title="مشاريعي"
        description="متابعة حية لمشاريعك، حالتها ونسب الإنجاز."
        actions={<LiveBadge interval={15} />}
      />
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Layers, label: "إجمالي المشاريع", value: stats.total, accent: "electric" },
          { icon: Activity, label: "قيد التنفيذ", value: stats.active, accent: "cyan" },
          { icon: CheckCircle2, label: "مكتملة", value: stats.completed, accent: "emerald" },
          { icon: Clock, label: "تستحق خلال أسبوع", value: stats.dueSoon, accent: "amber" },
          { icon: AlertTriangle, label: "متأخرة", value: stats.overdue, accent: "rose" },
          { icon: TrendingUp, label: "متوسط التقدم", value: `${stats.avg}%`, accent: "purple", hint: <span dir="ltr"><Money value={stats.totalBudget} /> إجمالي</span> },
        ]}
      />

      {/* Toolbar: search + view + sort */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في المشاريع…" className="h-9 pr-8 text-sm" />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">
          <SortBtn active={sort === "recent"} onClick={() => setSort("recent")}>الأحدث</SortBtn>
          <SortBtn active={sort === "due"} onClick={() => setSort("due")}>الاستحقاق</SortBtn>
          <SortBtn active={sort === "progress"} onClick={() => setSort("progress")}>التقدم</SortBtn>
          <SortBtn active={sort === "budget"} onClick={() => setSort("budget")}>الميزانية</SortBtn>
        </div>
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <Button size="sm" variant={view === "table" ? "default" : "ghost"} className="h-9 rounded-none px-2.5" onClick={() => setView("table")}><List className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant={view === "cards" ? "default" : "ghost"} className="h-9 rounded-none px-2.5" onClick={() => setView("cards")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

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

      {view === "table" ? (
        <DataTable
          columns={columns} rows={filtered} loading={list.isLoading}
          total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
          emptyTitle="لا توجد مشاريع بعد"
        />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-3.5 hover:border-electric/40 transition group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-black text-sm truncate group-hover:text-electric transition">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground">آخر تحديث {formatDate(r.updatedAt)}</div>
                </div>
                <StatusBadge value={r.status} />
              </div>
              {r.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{r.description}</p>}
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">التقدم</span>
                  <span className="font-black">{r.progress}%</span>
                </div>
                <Progress value={r.progress} className="h-1.5" />
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                {r.budget ? <Money value={r.budget} className="font-bold" /> : <span className="text-muted-foreground">—</span>}
                {r.dueDate && r.status !== "COMPLETED" ? <DueBadge date={r.dueDate} /> : <span className="text-[10px] text-muted-foreground">{formatDate(r.dueDate)}</span>}
              </div>
            </div>
          ))}
          {!list.isLoading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">لا توجد مشاريع مطابقة</div>
          )}
        </div>
      )}
    </div>
  );
}

function SortBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "h-8 rounded-md px-2.5 text-[11px] font-semibold transition",
      active ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground",
    )}>{children}</button>
  );
}
