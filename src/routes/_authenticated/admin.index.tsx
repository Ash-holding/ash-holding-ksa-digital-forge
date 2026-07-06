import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { MetricChip } from "@/components/dashboard/MetricChip";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { formatDate, fromNow } from "@/lib/format";
import { Money, moneyText } from "@/components/ui/money";
import {
  Users, FolderKanban, FileText, ScrollText, LifeBuoy, Wallet,
  AlertTriangle, AlertCircle, Info, ArrowUpRight,
  Clock, Trophy, Activity, Zap,
} from "lucide-react";
import {
  XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
  Area, CartesianGrid, Line, ComposedChart,
} from "recharts";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: OverviewPage,
});

const PIE_COLORS = ["#3b82f6", "#a855f7", "#06b6d4", "#f59e0b", "#f43f5e", "#10b981"];
const tooltipStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, direction: "rtl" as const, fontSize: 11 };

/** Unified Bento panel — same shell used across every section. */
function Panel({
  title, icon: Icon, iconColor = "text-electric", action, className, children,
}: { title?: string; icon?: any; iconColor?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-4 flex flex-col ${className ?? ""}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 mb-3 min-w-0">
          <h3 className="text-sm font-bold flex items-center gap-1.5 min-w-0 truncate">
            {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />}
            {title}
          </h3>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </section>
  );
}

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
    <div className="space-y-4">
      {/* Compact command hero — one line on desktop, stacked on mobile */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-l from-electric/10 via-card to-purple-accent/10 p-4"
      >
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.15),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          {data?.alerts?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {data.alerts.slice(0, 3).map((a: any, i: number) => (
                <AlertPill key={i} type={a.type} message={a.message} link={a.link} />
              ))}
            </div>
          )}
        </div>
      </motion.header>

      {/* Row 1 — 6 MetricChips: auto-reflow 2→3→4→6 cols with consistent gap */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <MetricChip icon={Wallet} label="إيرادات الشهر" value={<Money value={c?.monthRevenue ?? 0} />} loading={isLoading} accent="emerald" trend={t.revenue} spark={sp.revenue} />
        <MetricChip icon={Users} label="إجمالي العملاء" value={c?.clientsTotal ?? 0} loading={isLoading} accent="electric" trend={t.clients} spark={sp.clients} />
        <MetricChip icon={FolderKanban} label="مشاريع نشطة" value={c?.activeProjects ?? 0} loading={isLoading} accent="purple" trend={t.projects} spark={sp.projects} />
        <MetricChip icon={FileText} label="فواتير مستحقة" value={c?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" trend={t.invoices} spark={sp.invoices} />
        <MetricChip icon={ScrollText} label="عقود معلقة" value={c?.pendingContracts ?? 0} loading={isLoading} accent="cyan" trend={t.contracts} spark={sp.contracts} />
        <MetricChip icon={LifeBuoy} label="تذاكر مفتوحة" value={c?.openTickets ?? 0} loading={isLoading} accent="rose" trend={t.tickets} spark={sp.tickets} />
      </div>

      {/* Row 2 — KPI mini-strip: 2→2→4 cols */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <MetricChip icon={Trophy} label="معدل التحصيل" value={`${k?.collectionsRate ?? 0}%`} accent="emerald" hint="من إجمالي الفواتير" loading={isLoading} />
        <MetricChip icon={Activity} label="تقدم المشاريع" value={`${k?.avgProjectProgress ?? 0}%`} accent="electric" hint={`${c?.activeProjects ?? 0} مشروع نشط`} loading={isLoading} />
        <MetricChip icon={AlertTriangle} label="مبالغ متأخرة" value={<Money value={k?.overdueAmount ?? 0} />} accent="rose" hint="بحاجة متابعة" loading={isLoading} />
        <MetricChip icon={Trophy} label="عقود فعالة" value={<Money value={k?.activeContractsValue ?? 0} />} accent="purple" hint={`متوسط رد ${k?.avgTicketResponseHours ?? 0} س`} loading={isLoading} />
      </div>


      {/* Row 3 — Revenue chart (8) + Project statuses donut (4) */}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          title="الإيرادات مقابل المستهدف"
          action={
            <div className="flex items-center gap-3 text-[10px]">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-electric" />فعلي</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-accent" />مستهدف</span>
            </div>
          }
        >
          <div className="h-56 md:h-64">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
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
            )}
          </div>

        </Panel>

        <Panel
          className="xl:col-span-4"
          title="توزيع المشاريع"
          action={<span className="text-[10px] text-muted-foreground">{(data?.projectStatuses ?? []).reduce((s: number, x: any) => s + x.count, 0)} إجمالي</span>}
        >
          <div className="flex items-center gap-3 h-full">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data?.projectStatuses ?? []} dataKey="count" nameKey="status" innerRadius={42} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                    {(data?.projectStatuses ?? []).map((_: unknown, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {(data?.projectStatuses ?? []).slice(0, 6).map((s: any, i: number) => (
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
        </Panel>
      </div>

      {/* Row 4 — Invoices status (6) + Top clients (6) */}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-6" title="حالة الفواتير">
          <div className="space-y-2.5">
            {(data?.invoiceStatuses ?? []).map((s: any, i: number) => {
              const total = (data?.invoiceStatuses ?? []).reduce((sum: number, x: any) => sum + x.count, 0) || 1;
              const pct = Math.round((s.count / total) * 100);
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
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
        </Panel>

        <Panel
          className="xl:col-span-6"
          title="أعلى العملاء"
          icon={Trophy}
          iconColor="text-amber-400"
          action={<Link to="/admin/clients" className="text-[10px] text-electric hover:underline">الكل ←</Link>}
        >
          <div className="space-y-2">
            {(data?.topClients ?? []).slice(0, 5).map((cl: any, i: number) => {
              const max = Math.max(...(data?.topClients ?? []).map((x: any) => x.revenue), 1);
              const pct = (cl.revenue / max) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
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
        </Panel>
      </div>

      {/* Row 5 — Deadlines (7) + Activity (5) */}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          title="مواعيد قادمة"
          icon={Clock}
          iconColor="text-cyan-400"
          action={<Link to="/admin/projects" className="text-[10px] text-electric hover:underline">كل المشاريع ←</Link>}
        >
          <div className="space-y-1.5">
            {(data?.upcomingDeadlines ?? []).length === 0 && !isLoading && (
              <div className="text-[11px] text-muted-foreground text-center py-4">لا توجد مواعيد قادمة</div>
            )}
            {(data?.upcomingDeadlines ?? []).slice(0, 5).map((p: any) => (
              <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-center rounded-lg bg-muted/20 px-2.5 py-2 hover:bg-muted/40 transition">
                <div className="min-w-0">
                  <div className="text-[12px] font-bold truncate">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{p.client} · {formatDate(p.dueDate)}</div>
                </div>
                <div className="hidden sm:block w-24 shrink-0">
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
        </Panel>

        <Panel className="xl:col-span-5" title="آخر النشاطات" icon={Activity} iconColor="text-purple-accent">
          <div className="space-y-2">
            {[
              ...(data?.recentClients ?? []).slice(0, 2).map((cl: any) => ({ label: cl.user?.name, sub: cl.companyName || cl.user?.email, time: cl.createdAt, icon: Users, color: "electric" })),
              ...(data?.recentInvoices ?? []).slice(0, 2).map((iv: any) => ({ label: iv.invoiceNumber, sub: iv.client?.user?.name, time: iv.createdAt, icon: FileText, color: "amber", extra: <Money value={iv.total} className="text-[11px] font-bold" /> })),
              ...(data?.recentTickets ?? []).slice(0, 2).map((tk: any) => ({ label: tk.subject, sub: tk.client?.user?.name, time: tk.updatedAt, icon: LifeBuoy, color: "rose" })),
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
        </Panel>
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
      <span className="truncate max-w-[160px]">{message}</span>
      <ArrowUpRight className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
    </Link>
  );
}
