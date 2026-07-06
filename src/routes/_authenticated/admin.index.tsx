import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { formatSAR, formatDate, fromNow } from "@/lib/format";
import {
  Users, FolderKanban, FileText, ScrollText, LifeBuoy, Wallet,
  LayoutDashboard, AlertTriangle, AlertCircle, Info, ArrowUpRight,
  Target, TrendingUp, Clock, Trophy,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid, Line, ComposedChart,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: OverviewPage,
});

const PIE_COLORS = ["#3b82f6", "#a855f7", "#06b6d4", "#f59e0b", "#f43f5e", "#10b981"];
const tooltipStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, direction: "rtl" as const, fontSize: 12 };

function OverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await api.get("/admin/stats")).data,
  });

  const c = data?.cards;
  const t = data?.trends ?? {};
  const sp = data?.sparks ?? {};
  const k = data?.kpis;

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="نظرة عامة"
        description="ملخص أداء الشركة والعملاء والمشاريع خلال الشهر الحالي."
      />

      {/* Alerts */}
      {data?.alerts?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-2 md:grid-cols-3">
          {data.alerts.map((a: any, i: number) => (
            <AlertPill key={i} type={a.type} message={a.message} link={a.link} />
          ))}
        </motion.div>
      )}

      {/* Stats grid with sparklines */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Wallet} label="إيرادات الشهر" value={formatSAR(c?.monthRevenue ?? 0)} loading={isLoading} accent="emerald" trend={t.revenue} spark={sp.revenue} />
        <StatCard icon={Users} label="إجمالي العملاء" value={c?.clientsTotal ?? 0} loading={isLoading} accent="electric" trend={t.clients} spark={sp.clients} />
        <StatCard icon={FolderKanban} label="مشاريع نشطة" value={c?.activeProjects ?? 0} loading={isLoading} accent="purple" trend={t.projects} spark={sp.projects} />
        <StatCard icon={FileText} label="فواتير غير مدفوعة" value={c?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" trend={t.invoices} spark={sp.invoices} />
        <StatCard icon={ScrollText} label="عقود بانتظار التوقيع" value={c?.pendingContracts ?? 0} loading={isLoading} accent="cyan" trend={t.contracts} spark={sp.contracts} />
        <StatCard icon={LifeBuoy} label="تذاكر مفتوحة" value={c?.openTickets ?? 0} loading={isLoading} accent="rose" trend={t.tickets} spark={sp.tickets} />
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile icon={Target} label="معدل التحصيل" value={`${k?.collectionsRate ?? 0}%`} progress={k?.collectionsRate ?? 0} color="emerald" />
        <KpiTile icon={TrendingUp} label="متوسط تقدم المشاريع" value={`${k?.avgProjectProgress ?? 0}%`} progress={k?.avgProjectProgress ?? 0} color="electric" />
        <KpiTile icon={AlertTriangle} label="مبالغ متأخرة" value={formatSAR(k?.overdueAmount ?? 0)} sub={`${data?.invoiceStatuses?.find((s: any) => s.status === "متأخرة")?.count ?? 0} فاتورة`} color="rose" />
        <KpiTile icon={Trophy} label="قيمة العقود الفعالة" value={formatSAR(k?.activeContractsValue ?? 0)} sub={`متوسط استجابة ${k?.avgTicketResponseHours ?? 0} س`} color="purple" />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue vs target */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold">الإيرادات مقابل المستهدف</h3>
              <p className="text-[11px] text-muted-foreground">آخر 6 أشهر · ريال سعودي</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-electric" />فعلي</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-accent" />مستهدف</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={data?.revenueMonths ?? []}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} reversed />
                <YAxis stroke="#94a3b8" fontSize={11} orientation="right" tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatSAR(v)} />
                <Area type="monotone" dataKey="total" name="فعلي" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revFill)" />
                <Line type="monotone" dataKey="target" name="مستهدف" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project statuses */}
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <h3 className="font-bold mb-1">توزيع حالات المشاريع</h3>
          <p className="text-[11px] text-muted-foreground mb-2">إجمالي {(data?.projectStatuses ?? []).reduce((s: number, x: any) => s + x.count, 0)} مشروع</p>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data?.projectStatuses ?? []} dataKey="count" nameKey="status" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {(data?.projectStatuses ?? []).map((_: unknown, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2: invoice status + top clients */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <h3 className="font-bold mb-3">حالة الفواتير</h3>
          <div className="space-y-3">
            {(data?.invoiceStatuses ?? []).map((s: any, i: number) => {
              const totalCount = (data?.invoiceStatuses ?? []).reduce((sum: number, x: any) => sum + x.count, 0) || 1;
              const pct = Math.round((s.count / totalCount) * 100);
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="font-semibold">{s.status}</span>
                      <span className="text-muted-foreground">({s.count})</span>
                    </span>
                    <span className="font-bold">{formatSAR(s.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-400" />أعلى العملاء إيراداً</h3>
            <Link to="/admin/clients" className="text-xs text-electric hover:underline">كل العملاء ←</Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data?.topClients ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={140} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatSAR(v)} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upcoming deadlines */}
      <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-cyan-400" />مواعيد قادمة للمشاريع</h3>
          <Link to="/admin/projects" className="text-xs text-electric hover:underline">كل المشاريع ←</Link>
        </div>
        <div className="grid gap-2">
          {(data?.upcomingDeadlines ?? []).length === 0 && !isLoading && (
            <div className="text-xs text-muted-foreground text-center py-6">لا توجد مواعيد قادمة</div>
          )}
          {(data?.upcomingDeadlines ?? []).map((p: any) => (
            <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3 items-center rounded-xl bg-muted/20 p-3 hover:bg-muted/40 transition">
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{p.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{p.client}</div>
              </div>
              <div className="w-full md:w-48">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span>التقدم</span>
                  <span className="font-bold">{p.progress}%</span>
                </div>
                <Progress value={p.progress} className="h-1.5" />
              </div>
              <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                يستحق: <span className="font-semibold text-foreground">{formatDate(p.dueDate)}</span>
              </div>
              <StatusBadge value={p.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent lists */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentCard title="آخر العملاء" link="/admin/clients" empty="لا يوجد عملاء بعد">
          {data?.recentClients?.map((cl: any) => (
            <Link key={cl.id} to="/admin/clients/$id" params={{ id: cl.id }} className="block px-3 py-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{cl.user?.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{cl.companyName || cl.user?.email}</div>
                </div>
                <div className="text-[11px] text-muted-foreground shrink-0">{fromNow(cl.createdAt)}</div>
              </div>
            </Link>
          ))}
        </RecentCard>
        <RecentCard title="آخر الفواتير" link="/admin/invoices" empty="لا توجد فواتير">
          {data?.recentInvoices?.map((iv: any) => (
            <div key={iv.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-muted/50">
              <div className="min-w-0">
                <div className="text-sm font-semibold" dir="ltr">{iv.invoiceNumber}</div>
                <div className="text-[11px] text-muted-foreground truncate">{iv.client?.user?.name}</div>
              </div>
              <div className="text-left shrink-0">
                <div className="text-sm font-bold">{formatSAR(iv.total)}</div>
                <StatusBadge value={iv.status} />
              </div>
            </div>
          ))}
        </RecentCard>
        <RecentCard title="آخر التذاكر" link="/admin/support" empty="لا توجد تذاكر">
          {data?.recentTickets?.map((tk: any) => (
            <div key={tk.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-muted/50">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{tk.subject}</div>
                <div className="text-[11px] text-muted-foreground truncate">{tk.client?.user?.name} · {formatDate(tk.updatedAt)}</div>
              </div>
              <StatusBadge value={tk.status} />
            </div>
          ))}
        </RecentCard>
      </div>
    </>
  );
}

function AlertPill({ type, message, link }: { type: string; message: string; link: string }) {
  const styles: Record<string, string> = {
    danger: "bg-rose-500/10 border-rose-500/30 text-rose-300",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    info: "bg-electric/10 border-electric/30 text-electric",
  };
  const Icon = type === "danger" ? AlertCircle : type === "warning" ? AlertTriangle : Info;
  return (
    <Link to={link as never} className={`group flex items-center gap-2 rounded-xl border p-3 text-xs hover:brightness-110 transition ${styles[type]}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 font-semibold truncate">{message}</span>
      <ArrowUpRight className="h-4 w-4 opacity-60 group-hover:opacity-100 shrink-0" />
    </Link>
  );
}

function KpiTile({ icon: Icon, label, value, progress, sub, color }: { icon: any; label: string; value: string; progress?: number; sub?: string; color: "emerald" | "electric" | "rose" | "purple" }) {
  const colors: Record<string, { bar: string; ring: string }> = {
    emerald: { bar: "bg-emerald-500", ring: "text-emerald-400 bg-emerald-500/10" },
    electric: { bar: "bg-electric", ring: "text-electric bg-electric/10" },
    rose: { bar: "bg-rose-500", ring: "text-rose-400 bg-rose-500/10" },
    purple: { bar: "bg-purple-accent", ring: "text-purple-accent bg-purple-accent/10" },
  };
  const c = colors[color];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${c.ring}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="text-xl font-black">{value}</div>
      {typeof progress === "number" && (
        <div className="mt-2 h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div className={`h-full ${c.bar} transition-all`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      {sub && <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RecentCard({ title, link, children, empty }: { title: string; link: string; children: React.ReactNode; empty: string }) {
  const kids = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">{title}</h3>
        <Link to={link as never} className="text-xs text-electric hover:underline">عرض الكل ←</Link>
      </div>
      <div className="space-y-1">
        {kids && (Array.isArray(kids) ? kids.length : 0) > 0
          ? children
          : <div className="text-xs text-muted-foreground text-center py-6">{empty}</div>}
      </div>
    </div>
  );
}
