import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { MetricChip, RingKpi } from "@/components/dashboard/MetricChip";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { formatDate, fromNow } from "@/lib/format";
import { Money, moneyText } from "@/components/ui/money";
import {
  Users, FolderKanban, FileText, ScrollText, LifeBuoy, Wallet,
  AlertTriangle, AlertCircle, Info, ArrowUpRight,
  Target, TrendingUp, Clock, Trophy, Activity, Sparkles, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
  Area, CartesianGrid, Line, ComposedChart,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: OverviewPage,
});

const PIE_COLORS = ["#3b82f6", "#a855f7", "#06b6d4", "#f59e0b", "#f43f5e", "#10b981"];
const tooltipStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, direction: "rtl" as const, fontSize: 11 };

function OverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await api.get("/admin/stats")).data,
  });

  const c = data?.cards;
  const t = data?.trends ?? {};
  const sp = data?.sparks ?? {};
  const k = data?.kpis;
  const now = new Date();

  return (
    <div className="space-y-3">
      {/* Command-bar hero — dense, live, no wasted space */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-l from-electric/10 via-card to-purple-accent/10"
      >
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.15),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-3 p-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-electric/15 text-electric shrink-0">
              <Zap className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">مركز القيادة</div>
              <h1 className="text-base md:text-lg font-black truncate">
                نظرة عامة · <span className="text-electric">{now.toLocaleDateString("ar-SA", { weekday: "long" })}</span>
              </h1>
            </div>
          </div>
          <div className="h-px lg:h-9 lg:w-px bg-border/60" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
            <PulseStat label="إيرادات الشهر" value={<Money value={c?.monthRevenue ?? 0} />} trend={t.revenue} color="emerald" />
            <PulseStat label="مشاريع نشطة" value={c?.activeProjects ?? 0} trend={t.projects} color="electric" />
            <PulseStat label="فواتير مستحقة" value={c?.unpaidInvoices ?? 0} trend={t.invoices} color="amber" />
            <PulseStat label="تذاكر مفتوحة" value={c?.openTickets ?? 0} trend={t.tickets} color="rose" />
          </div>
        </div>
        {data?.alerts?.length > 0 && (
          <div className="relative flex flex-wrap gap-1.5 px-3.5 pb-3">
            {data.alerts.slice(0, 4).map((a: any, i: number) => (
              <AlertPill key={i} type={a.type} message={a.message} link={a.link} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Row 2: Dense metric grid (6 chips) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <MetricChip icon={Wallet} label="إيرادات الشهر" value={<Money value={c?.monthRevenue ?? 0} />} loading={isLoading} accent="emerald" trend={t.revenue} spark={sp.revenue} />
        <MetricChip icon={Users} label="إجمالي العملاء" value={c?.clientsTotal ?? 0} loading={isLoading} accent="electric" trend={t.clients} spark={sp.clients} />
        <MetricChip icon={FolderKanban} label="مشاريع نشطة" value={c?.activeProjects ?? 0} loading={isLoading} accent="purple" trend={t.projects} spark={sp.projects} />
        <MetricChip icon={FileText} label="فواتير مستحقة" value={c?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" trend={t.invoices} spark={sp.invoices} />
        <MetricChip icon={ScrollText} label="عقود معلقة" value={c?.pendingContracts ?? 0} loading={isLoading} accent="cyan" trend={t.contracts} spark={sp.contracts} />
        <MetricChip icon={LifeBuoy} label="تذاكر مفتوحة" value={c?.openTickets ?? 0} loading={isLoading} accent="rose" trend={t.tickets} spark={sp.tickets} />
      </div>

      {/* Row 3: Bento — revenue chart (8) + unified KPI card (4) */}
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold">الإيرادات مقابل المستهدف</h3>
              <p className="text-[10px] text-muted-foreground">آخر 6 أشهر</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-electric" />فعلي</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-accent" />مستهدف</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={data?.revenueMonths ?? []} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} reversed />
                <YAxis stroke="#94a3b8" fontSize={10} orientation="right" tickFormatter={(v) => `${v / 1000}k`} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => moneyText(v)} />
                <Area type="monotone" dataKey="total" name="فعلي" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revFill)" />
                <Line type="monotone" dataKey="target" name="مستهدف" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Unified KPI card — 4 rows, matches chart height */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-4 flex flex-col">
          <h3 className="text-sm font-bold mb-3">مؤشرات الأداء</h3>
          <div className="flex flex-col divide-y divide-border/60 flex-1">
            <KpiRow label="معدل التحصيل" value={`${k?.collectionsRate ?? 0}%`} progress={k?.collectionsRate ?? 0} color="emerald" sub="من إجمالي الفواتير" />
            <KpiRow label="تقدم المشاريع" value={`${k?.avgProjectProgress ?? 0}%`} progress={k?.avgProjectProgress ?? 0} color="electric" sub={`${c?.activeProjects ?? 0} مشروع نشط`} />
            <KpiRow label="مبالغ متأخرة" value={<Money value={k?.overdueAmount ?? 0} />} color="rose" icon={AlertTriangle} sub="بحاجة متابعة" />
            <KpiRow label="عقود فعالة" value={<Money value={k?.activeContractsValue ?? 0} />} color="purple" icon={Trophy} sub={`متوسط رد ${k?.avgTicketResponseHours ?? 0} س`} />
          </div>
        </div>
      </div>


      {/* Row 4: 3-column bento — statuses / invoices / top clients */}
      <div className="grid gap-3 lg:grid-cols-12">
        {/* Project statuses — compact donut with legend list */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold">توزيع المشاريع</h3>
            <span className="text-[10px] text-muted-foreground">{(data?.projectStatuses ?? []).reduce((s: number, x: any) => s + x.count, 0)} إجمالي</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-32 w-32 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data?.projectStatuses ?? []} dataKey="count" nameKey="status" innerRadius={35} outerRadius={60} paddingAngle={2} strokeWidth={0}>
                    {(data?.projectStatuses ?? []).map((_: unknown, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1 min-w-0">
              {(data?.projectStatuses ?? []).slice(0, 5).map((s: any, i: number) => (
                <div key={s.status} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate">{s.status}</span>
                  </span>
                  <span className="font-bold shrink-0">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invoice status bars */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-3.5">
          <h3 className="text-sm font-bold mb-2">حالة الفواتير</h3>
          <div className="space-y-2">
            {(data?.invoiceStatuses ?? []).map((s: any, i: number) => {
              const total = (data?.invoiceStatuses ?? []).reduce((sum: number, x: any) => sum + x.count, 0) || 1;
              const pct = Math.round((s.count / total) * 100);
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="font-semibold truncate">{s.status}</span>
                      <span className="text-muted-foreground shrink-0">({s.count})</span>
                    </span>
                    <Money value={s.total} className="font-bold text-[11px] shrink-0" />
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top clients — compact ranking */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-amber-400" />أعلى العملاء</h3>
            <Link to="/admin/clients" className="text-[10px] text-electric hover:underline">الكل ←</Link>
          </div>
          <div className="space-y-1.5">
            {(data?.topClients ?? []).slice(0, 5).map((cl: any, i: number) => {
              const max = Math.max(...(data?.topClients ?? []).map((x: any) => x.revenue), 1);
              const pct = (cl.revenue / max) * 100;
              return (
                <div key={i} className="group">
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span className="grid h-4 w-4 place-items-center rounded text-[9px] font-black bg-electric/10 text-electric shrink-0">{i + 1}</span>
                      <span className="truncate font-semibold">{cl.name}</span>
                    </span>
                    <Money value={cl.revenue} className="text-[11px] font-bold shrink-0" />
                  </div>
                  <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-electric to-purple-accent transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {(data?.topClients ?? []).length === 0 && !isLoading && (
              <div className="text-[11px] text-muted-foreground text-center py-4">لا توجد بيانات</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Deadlines (7) + Activity ticker (5) */}
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-cyan-400" />مواعيد قادمة</h3>
            <Link to="/admin/projects" className="text-[10px] text-electric hover:underline">كل المشاريع ←</Link>
          </div>
          <div className="space-y-1.5">
            {(data?.upcomingDeadlines ?? []).length === 0 && !isLoading && (
              <div className="text-[11px] text-muted-foreground text-center py-4">لا توجد مواعيد قادمة</div>
            )}
            {(data?.upcomingDeadlines ?? []).slice(0, 5).map((p: any) => (
              <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center rounded-lg bg-muted/20 px-2.5 py-2 hover:bg-muted/40 transition">
                <div className="min-w-0">
                  <div className="text-[12px] font-bold truncate">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{p.client} · {formatDate(p.dueDate)}</div>
                </div>
                <div className="w-24 shrink-0">
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">تقدم</span>
                    <span className="font-bold">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-1" />
                </div>
                <StatusBadge value={p.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-3.5">
          <h3 className="text-sm font-bold flex items-center gap-1.5 mb-2"><Activity className="h-3.5 w-3.5 text-purple-accent" />آخر النشاطات</h3>
          <div className="space-y-2">
            {[
              ...(data?.recentClients ?? []).slice(0, 2).map((cl: any) => ({ type: "client", label: cl.user?.name, sub: cl.companyName || cl.user?.email, time: cl.createdAt, icon: Users, color: "electric", to: `/admin/clients/${cl.id}` })),
              ...(data?.recentInvoices ?? []).slice(0, 2).map((iv: any) => ({ type: "invoice", label: iv.invoiceNumber, sub: iv.client?.user?.name, time: iv.createdAt, icon: FileText, color: "amber", extra: <Money value={iv.total} className="text-[11px] font-bold" /> })),
              ...(data?.recentTickets ?? []).slice(0, 2).map((tk: any) => ({ type: "ticket", label: tk.subject, sub: tk.client?.user?.name, time: tk.updatedAt, icon: LifeBuoy, color: "rose" })),
            ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6).map((item: any, i: number) => {
              const Icon = item.icon;
              const colors: Record<string, string> = {
                electric: "bg-electric/10 text-electric",
                amber: "bg-amber-500/10 text-amber-400",
                rose: "bg-rose-500/10 text-rose-400",
              };
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg shrink-0 ${colors[item.color]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold truncate">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{item.sub}</div>
                  </div>
                  <div className="text-left shrink-0">
                    {item.extra}
                    <div className="text-[10px] text-muted-foreground">{fromNow(item.time)}</div>
                  </div>
                </div>
              );
            })}
            {!isLoading && !(data?.recentClients?.length || data?.recentInvoices?.length || data?.recentTickets?.length) && (
              <div className="text-[11px] text-muted-foreground text-center py-4">لا يوجد نشاط بعد</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PulseStat({ label, value, trend, color }: { label: string; value: React.ReactNode; trend?: number; color: "emerald" | "electric" | "amber" | "rose" }) {
  const dot: Record<string, string> = {
    emerald: "bg-emerald-400", electric: "bg-electric", amber: "bg-amber-400", rose: "bg-rose-400",
  };
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot[color]}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm font-black truncate">{value}</span>
          {typeof trend === "number" && (
            <span className={`text-[9px] font-bold shrink-0 ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {trend >= 0 ? "▲" : "▼"}{Math.abs(trend).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiRow({ label, value, progress, sub, color, icon: Icon }: { label: string; value: React.ReactNode; progress?: number; sub?: string; color: "emerald" | "electric" | "rose" | "purple"; icon?: any }) {
  const colors: Record<string, { text: string; bg: string; stroke: string }> = {
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", stroke: "#10b981" },
    electric: { text: "text-electric", bg: "bg-electric/10", stroke: "#3b82f6" },
    rose: { text: "text-rose-400", bg: "bg-rose-500/10", stroke: "#f43f5e" },
    purple: { text: "text-purple-accent", bg: "bg-purple-accent/10", stroke: "#a855f7" },
  };
  const cc = colors[color];
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      {pct !== null ? (
        <div className="relative h-11 w-11 shrink-0">
          <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
            <circle cx="22" cy="22" r="17" stroke="currentColor" strokeWidth="3.5" fill="none" className="text-muted/25" />
            <circle cx="22" cy="22" r="17" stroke={cc.stroke} strokeWidth="3.5" fill="none"
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 17} ${2 * Math.PI * 17}`} strokeLinecap="round"
              style={{ transition: "stroke-dasharray 600ms ease" }} />
          </svg>
          <div className={`absolute inset-0 grid place-items-center text-[9px] font-black ${cc.text}`}>{pct}%</div>
        </div>
      ) : (
        <div className={`grid h-11 w-11 place-items-center rounded-xl shrink-0 ${cc.bg} ${cc.text}`}>
          {Icon && <Icon className="h-5 w-5" />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground truncate">{label}</div>
        <div className="text-sm font-black leading-tight truncate">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
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
    <Link to={link as never} className={`group inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold hover:brightness-110 transition ${styles[type]}`}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[180px]">{message}</span>
      <ArrowUpRight className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
    </Link>
  );
}
