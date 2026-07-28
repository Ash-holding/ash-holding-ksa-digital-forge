import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FolderKanban, Layers, Activity, CheckCircle2, AlertTriangle,
  Search, LayoutGrid, List, TrendingUp, Clock, Plus, Inbox, Sparkles,
  Trash2, MessageSquare, Zap, Rocket,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { LiveBadge, DueBadge } from "@/components/client/LiveBadge";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";

import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client/projects/")({
  head: () => ({
    meta: [
      { title: "مشاريعي — بوابة العميل" },
      { name: "description", content: "تابع مشاريعك وطلبات المشاريع من بوابة العميل في آش هولدنق." },
      { property: "og:title", content: "مشاريعي — بوابة العميل" },
      { property: "og:description", content: "تابع مشاريعك وطلبات المشاريع من بوابة العميل في آش هولدنق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientProjectsPage,
});

type SortKey = "recent" | "due" | "progress" | "budget";
type Tab = "projects" | "requests";

function ClientProjectsPage() {
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialTab: Tab = search?.get("tab") === "requests" ? "requests" : "projects";
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={FolderKanban}
        title="مشاريعي"
        description="متابعة حية لمشاريعك وطلباتك — تحديث لحظي مع فريق الإدارة."
        actions={
          <div className="flex items-center gap-2">
            <LiveBadge interval={15} />
            <Button asChild size="sm"
              className="gap-1.5 bg-gradient-to-r from-electric to-purple-accent shadow-glow">
              <Link to="/client/projects/new">
                <Rocket className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">طلب مشروع جديد</span>
                <span className="sm:hidden">طلب</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="inline-flex items-center rounded-2xl bg-muted/40 p-1 border border-border">
        <TabBtn active={tab === "projects"} onClick={() => setTab("projects")} icon={FolderKanban} label="مشاريعي" />
        <TabBtn active={tab === "requests"} onClick={() => setTab("requests")} icon={Inbox} label="طلباتي" />
      </div>

      {tab === "projects" ? <ProjectsView /> : <RequestsView />}
    </div>
  );
}

function EmptyProjectsHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-electric/5 via-card to-purple-accent/5 p-6 sm:p-10">
      <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-electric/20 blur-3xl" />
      <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-purple-accent/20 blur-3xl" />
      <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-[11px] font-bold text-electric">
            <Sparkles className="h-3 w-3" />ابدأ رحلتك معنا
          </div>
          <h3 className="text-xl sm:text-2xl font-black leading-tight">لا توجد مشاريع بعد — لنُطلق أول مشروع لك</h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            قدّم طلب مشروع جديد خلال دقائق. فريقنا يراجع الطلب فورًا ويتواصل معك خلال 24 ساعة عمل عبر بوابتك أو واتساب.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button asChild size="sm" className="gap-1.5 h-10 px-4 bg-gradient-to-r from-electric to-purple-accent shadow-glow">
              <Link to="/client/projects/new"><Rocket className="h-4 w-4" />طلب مشروع جديد</Link>
            </Button>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Zap className="h-3 w-3 text-amber-500" />استجابة خلال 24 ساعة
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3">
            {[
              { icon: Layers, label: "8 فئات" },
              { icon: MessageSquare, label: "دعم مباشر" },
              { icon: CheckCircle2, label: "تتبع لحظي" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-1.5 rounded-xl border border-border bg-card/50 px-2.5 py-2 text-[11px] font-bold">
                <f.icon className="h-3.5 w-3.5 text-electric" />{f.label}
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-electric to-purple-accent shadow-glow">
          <Rocket className="h-16 w-16 text-white" />
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 rounded-xl px-3.5 text-[12px] font-bold transition",
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
      )}>
      <Icon className="h-3.5 w-3.5" />{label}
    </button>
  );
}

/* ---------------- PROJECTS VIEW ---------------- */

function ProjectsView() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "cards">("cards");
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
        {r.dueDate && r.status !== "COMPLETED" && <div className="mt-0.5 md:hidden"><DueBadge date={r.dueDate} /></div>}
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
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Layers, label: "إجمالي المشاريع", value: stats.total, accent: "electric" },
          { icon: Activity, label: "قيد التنفيذ", value: stats.active, accent: "cyan" },
          { icon: CheckCircle2, label: "مكتملة", value: stats.completed, accent: "emerald" },
          { icon: Clock, label: "تستحق خلال أسبوع", value: stats.dueSoon, accent: "amber" },
          { icon: AlertTriangle, label: "متأخرة", value: stats.overdue, accent: "rose" },
          { icon: TrendingUp, label: "متوسط التقدم", value: `${stats.avg}%`, accent: "purple", hint: `إجمالي ${stats.totalBudget.toLocaleString("ar-SA")} ر.س` },
        ]}
      />

      {!list.isLoading && rows.length === 0 ? (
        <EmptyProjectsHero />
      ) : (
      <>


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
        <DataTable columns={columns} rows={filtered} loading={list.isLoading}
          total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
          emptyTitle="لا توجد مشاريع بعد" />
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
      </>
      )}
    </div>
  );
}


/* ---------------- REQUESTS VIEW ---------------- */

function RequestsView() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["client-project-requests", status],
    queryFn: async () => (await api.get("/projects/requests/list", { params: { status: status ?? undefined, pageSize: 50 } })).data,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = list.data?.stats ?? { total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0, urgent: 0, last24h: 0 };

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/requests/${id}`),
    onSuccess: () => { toast.success("تم حذف الطلب"); qc.invalidateQueries({ queryKey: ["client-project-requests"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div className="space-y-3">
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Inbox, label: "إجمالي الطلبات", value: stats.total, accent: "electric" },
          { icon: Clock, label: "قيد الانتظار", value: stats.pending, accent: "amber" },
          { icon: Sparkles, label: "قيد الدراسة", value: stats.underReview, accent: "cyan" },
          { icon: CheckCircle2, label: "مقبولة / محوّلة", value: stats.approved, accent: "emerald" },
          { icon: AlertTriangle, label: "مرفوضة", value: stats.rejected, accent: "rose" },
          { icon: Zap, label: "طلبات عاجلة", value: stats.urgent, accent: "purple", hint: `آخر 24س: ${stats.last24h}` },
        ]}
      />

      <FilterChips
        value={status} onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: stats.total },
          { key: "PENDING", label: "قيد الانتظار", count: stats.pending },
          { key: "UNDER_REVIEW", label: "قيد الدراسة", count: stats.underReview },
          { key: "APPROVED", label: "مقبولة" },
          { key: "CONVERTED", label: "محوّلة" },
          { key: "REJECTED", label: "مرفوضة", count: stats.rejected },
        ]}
      />

      {!list.isLoading && rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-electric to-purple-accent mb-3">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div className="font-black text-lg mb-1">لا توجد طلبات بعد</div>
          <p className="text-sm text-muted-foreground mb-4">ابدأ مشروعك الجديد بضغطة واحدة — سنراجعه ونعود لك خلال 24 ساعة.</p>
          <Button asChild className="gap-1.5 bg-gradient-to-r from-electric to-purple-accent">
            <Link to="/client/projects/new"><Plus className="h-4 w-4" />طلب مشروع جديد</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="group rounded-2xl border border-border bg-card p-3.5 hover:border-electric/40 transition">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-black text-sm truncate group-hover:text-electric transition">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground">مُرسل {formatDate(r.createdAt)}</div>
                </div>
                <StatusBadge value={r.status} />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold">{r.category}</span>
                <StatusBadge value={r.priority} />
              </div>

              {r.description && <p className="text-[11px] text-muted-foreground line-clamp-3 mb-2">{r.description}</p>}

              {(r.budgetMin || r.budgetMax) && (
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-muted-foreground">الميزانية</span>
                  <span className="font-bold">
                    {r.budgetMin ? Number(r.budgetMin).toLocaleString("ar-SA") : "—"}
                    {" – "}
                    {r.budgetMax ? Number(r.budgetMax).toLocaleString("ar-SA") : "—"} ر.س
                  </span>
                </div>
              )}

              {r.targetDate && (
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-muted-foreground">التاريخ المستهدف</span>
                  <span className="font-bold">{formatDate(r.targetDate)}</span>
                </div>
              )}

              {r.adminNote && (
                <div className="rounded-lg bg-electric/5 border border-electric/20 p-2 text-[11px] flex gap-1.5 mt-2">
                  <MessageSquare className="h-3 w-3 shrink-0 mt-0.5 text-electric" />
                  <div><b className="text-electric">رد الإدارة:</b> {r.adminNote}</div>
                </div>
              )}

              {r.status === "PENDING" && (
                <div className="mt-2 flex justify-end">
                  <ConfirmDialog title="حذف الطلب" description="سيتم حذف هذا الطلب نهائياً."
                    onConfirm={async () => { await del.mutateAsync(r.id); }}
                    trigger={<Button size="sm" variant="ghost" className="h-7 text-rose-400 gap-1 text-[11px]"><Trash2 className="h-3 w-3" />حذف</Button>}
                  />
                </div>
              )}
            </div>
          ))}
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
