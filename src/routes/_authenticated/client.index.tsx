import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  FolderKanban, Boxes, FileText, ScrollText, LifeBuoy, Bell, Files,
  Wallet, AlertTriangle, Clock, Sparkles, Activity, ArrowUpRight, CheckCircle2,
  Plus, Upload, HelpCircle, Zap, Trophy, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { api } from "@/lib/api";
import { MetricChip } from "@/components/dashboard/MetricChip";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate, fromNow } from "@/lib/format";
import { Money, moneyText } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/client/")({
  component: ClientOverview,
});

const PIE_COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#3b82f6", "#a855f7", "#06b6d4"];
const tooltipStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, direction: "rtl" as const, fontSize: 11 };

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

function ChartSkeleton() {
  return (
    <div className="h-full w-full rounded-lg bg-gradient-to-t from-foreground/10 to-foreground/5 animate-pulse flex items-end gap-1.5 p-2">
      {[40, 65, 50, 80, 55, 70, 90, 60, 75, 85, 65, 95].map((h, i) => (
        <div key={i} className="flex-1 rounded-t bg-foreground/15" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
function LineSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="h-2.5 flex-1 rounded bg-foreground/15 animate-pulse" />
      <div className="h-2.5 w-8 rounded bg-foreground/15 animate-pulse" />
    </div>
  );
}
function BarSkeleton() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="h-2.5 w-24 rounded bg-foreground/15 animate-pulse" />
        <div className="h-2.5 w-14 rounded bg-foreground/15 animate-pulse" />
      </div>
      <div className="h-1.5 rounded-full bg-foreground/15 animate-pulse" />
    </div>
  );
}
function RowSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center rounded-lg bg-foreground/5 px-2.5 py-2">
      <div className="space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-foreground/15 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-foreground/15 animate-pulse" />
      </div>
      <div className="h-5 w-14 rounded bg-foreground/15 animate-pulse" />
    </div>
  );
}
function ActivitySkeleton() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-7 w-7 rounded-lg bg-foreground/15 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-foreground/15 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-foreground/15 animate-pulse" />
      </div>
      <div className="h-2.5 w-10 rounded bg-foreground/15 animate-pulse shrink-0" />
    </div>
  );
}

function ClientOverview() {
  const { user } = useAuth();
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["client", "overview"],
    queryFn: async () => (await api.get("/clients/me/overview")).data,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const s = data?.stats;
  const t = data?.trends ?? {};
  const sp = data?.sparks ?? {};
  const k = data?.kpis;

  const totalInvoice = ((data?.invoiceBreakdown ?? []) as any[]).reduce((sum, x) => sum + (x.count || 0), 0);

  return (
    <div className="space-y-4">
      {/* Compact command hero — mirrors admin layout */}
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
              <div className="text-[10px] text-foreground/70 uppercase tracking-widest">بوابة العميل</div>
              <h1 className="text-base md:text-lg font-black truncate">
                مرحباً <span className="text-electric">{user?.name?.split(" ")[0] ?? "بك"}</span> 👋
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              مباشر · تحديث كل 15ث
            </span>
            <QuickAction icon={Plus} to="/client/projects" label="مشروع" />
            <QuickAction icon={Upload} to="/client/files" label="رفع" />
            <QuickAction icon={HelpCircle} to="/client/support" label="دعم" />
          </div>
        </div>
      </motion.header>

      {/* Row 1 — 6 MetricChips: auto-reflow 2→3→4→6 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <MetricChip icon={FolderKanban} label="مشاريع نشطة" value={s?.activeProjects ?? 0} loading={isLoading} accent="electric" trend={t.projects} spark={sp.projects} />
        <MetricChip icon={Boxes} label="خدمات" value={s?.activeServices ?? 0} loading={isLoading} accent="purple" />
        <MetricChip icon={FileText} label="فواتير مستحقة" value={s?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" trend={t.invoices} spark={sp.invoices} />
        <MetricChip icon={ScrollText} label="عقود معلقة" value={s?.pendingContracts ?? 0} loading={isLoading} accent="cyan" />
        <MetricChip icon={LifeBuoy} label="تذاكر" value={s?.openTickets ?? 0} loading={isLoading} accent="rose" trend={t.tickets} spark={sp.tickets} />
        <MetricChip icon={Bell} label="إشعارات" value={s?.unreadNotifications ?? 0} loading={isLoading} accent="emerald" trend={t.notifications} spark={sp.notifications} />
      </div>

      {/* Row 2 — Financial KPI strip: 2→4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <MetricChip icon={Wallet} label="إجمالي مدفوع" value={<Money value={k?.totalSpent ?? 0} />} accent="emerald" loading={isLoading} hint="مجموع دفعاتك" />
        <MetricChip icon={Clock} label="مبالغ معلقة" value={<Money value={k?.pendingAmount ?? 0} />} accent="amber" loading={isLoading} hint="بانتظار السداد" />
        <MetricChip icon={AlertTriangle} label="مبالغ متأخرة" value={<Money value={k?.overdueAmount ?? 0} />} accent="rose" loading={isLoading} hint="بحاجة اهتمام" />
        <MetricChip icon={Trophy} label="مؤشر الرضا" value={`${k?.satisfactionScore ?? 0}%`} accent="purple" loading={isLoading} hint="من تفاعلك مع الخدمات" />
      </div>

      {/* Row 3 — Spending chart (8) + Invoice donut (4) */}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          title="مصروفاتك الشهرية"
          icon={TrendingUp}
          iconColor="text-purple-accent"
          action={<span className="text-[10px] text-foreground/70">آخر 6 أشهر</span>}
        >
          <div className="h-56 md:h-64">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer>
                <AreaChart data={data?.spendingMonths ?? []} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} reversed />
                  <YAxis stroke="#94a3b8" fontSize={10} orientation="right" tickFormatter={(v) => `${v / 1000}k`} width={40} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => moneyText(v)} />
                  <Area type="monotone" dataKey="amount" name="المصروفات" stroke="#a855f7" strokeWidth={2.5} fill="url(#spendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel
          className="xl:col-span-4"
          title="توزيع الفواتير"
          icon={FileText}
          iconColor="text-amber-400"
          action={<span className="text-[10px] text-foreground/70">{totalInvoice} إجمالي</span>}
        >
          <div className="flex items-center gap-3 h-full">
            <div className="h-40 w-40 shrink-0">
              {isLoading ? (
                <div className="h-40 w-40 rounded-full border-[14px] border-muted/40 animate-pulse" />
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data?.invoiceBreakdown ?? []} dataKey="count" nameKey="status" innerRadius={42} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                      {(data?.invoiceBreakdown ?? []).map((_: unknown, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <LineSkeleton key={i} />)
                : (data?.invoiceBreakdown ?? []).slice(0, 6).map((b: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate">{b.status}</span>
                    </span>
                    <span className="font-bold shrink-0">{b.count}</span>
                  </div>
                ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 4 — Upcoming payments (6) + Project progress (6) */}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-6"
          title="مدفوعات قادمة"
          icon={Clock}
          iconColor="text-amber-400"
          action={<Link to="/client/invoices" className="text-[10px] text-electric hover:underline">الكل ←</Link>}
        >
          <div className="space-y-1.5">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
            {!isLoading && (data?.upcomingPayments ?? []).length === 0 && (
              <div className="text-[11px] text-foreground/70 text-center py-6">لا توجد فواتير مستحقة 🎉</div>
            )}
            {!isLoading && (data?.upcomingPayments ?? []).slice(0, 5).map((p: any) => {
              const overdue = p.daysLeft < 0;
              return (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center rounded-lg bg-foreground/5 px-2.5 py-2 hover:bg-foreground/15 transition">
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold" dir="ltr">{p.invoiceNumber}</div>
                    <div className={`text-[10px] truncate ${overdue ? "text-rose-400 font-semibold" : "text-foreground/70"}`}>
                      {overdue ? `متأخر ${Math.abs(p.daysLeft)} يوم` : `خلال ${p.daysLeft} يوم`} · {formatDate(p.dueDate)}
                    </div>
                  </div>
                  <div className="text-left shrink-0 flex items-center gap-2">
                    <Money value={p.amount} className="text-[12px] font-bold" />
                    <StatusBadge value={p.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          className="xl:col-span-6"
          title="تقدم المشاريع"
          icon={FolderKanban}
          iconColor="text-electric"
          action={<Link to="/client/projects" className="text-[10px] text-electric hover:underline">الكل ←</Link>}
        >
          <div className="space-y-2.5">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <BarSkeleton key={i} />)}
            {!isLoading && (data?.projectProgress ?? []).length === 0 && (
              <div className="text-[11px] text-foreground/70 text-center py-6">لا توجد مشاريع بعد</div>
            )}
            {!isLoading && (data?.projectProgress ?? []).slice(0, 5).map((p: any) => (
              <div key={p.id}>
                <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold truncate block">{p.name}</span>
                    <span className="text-[10px] text-foreground/70">يستحق {formatDate(p.dueDate)}</span>
                  </span>
                  <span className="shrink-0 flex items-center gap-2">
                    <span className="text-[11px] font-black">{p.progress}%</span>
                    <StatusBadge value={p.status} />
                  </span>
                </div>
                <Progress value={p.progress} className="h-1" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Row 5 — Activity (7) + Files (5) */}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          title="آخر النشاطات"
          icon={Activity}
          iconColor="text-purple-accent"
        >
          <div className="space-y-2.5">
            {isLoading && Array.from({ length: 5 }).map((_, i) => <ActivitySkeleton key={i} />)}
            {!isLoading && (data?.recentActivity ?? []).length === 0 && (
              <div className="text-[11px] text-foreground/70 text-center py-6">لا يوجد نشاط بعد</div>
            )}
            {!isLoading && (data?.recentActivity ?? []).slice(0, 6).map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-electric/10 text-electric shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px]">{a.message}</div>
                  <div className="text-[10px] text-foreground/70">{fromNow(a.time)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          className="xl:col-span-5"
          title="آخر الملفات"
          icon={Files}
          iconColor="text-cyan-400"
          action={<Link to="/client/files" className="text-[10px] text-electric hover:underline">الكل ←</Link>}
        >
          <div className="space-y-1.5">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
            {!isLoading && (data?.recentFiles ?? []).length === 0 && (
              <div className="text-[11px] text-foreground/70 text-center py-6">لا توجد ملفات</div>
            )}
            {!isLoading && (data?.recentFiles ?? []).slice(0, 5).map((f: any) => (
              <a key={f.id} href={f.path} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-foreground/5 px-2.5 py-2 hover:bg-foreground/15 transition">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-electric/10 text-electric shrink-0"><FileText className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate">{f.originalName}</div>
                  <div className="text-[10px] text-foreground/70 truncate">{(f.size / 1024).toFixed(1)} KB · {formatDate(f.createdAt)}</div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
              </a>
            ))}
          </div>
        </Panel>
      </div>

      {(k?.satisfactionScore ?? 0) >= 80 && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-[11px] text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          أداء ممتاز! تفاعلك مع الخدمات فوق المتوسط.
        </div>
      )}

      {dataUpdatedAt > 0 && (
        <div className="text-center text-[10px] text-foreground/50">
          آخر تحديث {fromNow(new Date(dataUpdatedAt).toISOString())}
        </div>
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, to }: { icon: any; label: string; to: string }) {
  return (
    <Link to={to as never} className="inline-flex items-center gap-1 rounded-lg bg-electric/10 hover:bg-electric/20 text-electric px-2 py-1.5 text-[10px] font-bold transition">
      <Icon className="h-3 w-3" />
      {label}
    </Link>
  );
}
