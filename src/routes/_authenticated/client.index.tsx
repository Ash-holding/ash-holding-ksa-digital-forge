import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FolderKanban, Boxes, FileText, ScrollText, LifeBuoy, Bell, Files,
  Wallet, AlertTriangle, Clock, Sparkles, Activity, ArrowUpRight, CheckCircle2,
  Plus, Upload, HelpCircle, Zap,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { api } from "@/lib/api";
import { MetricChip, RingKpi } from "@/components/dashboard/MetricChip";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate, fromNow } from "@/lib/format";
import { Money, moneyText } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/client/")({
  component: ClientOverview,
});

const PIE_COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#3b82f6"];
const tooltipStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, direction: "rtl" as const, fontSize: 11 };

function ClientOverview() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["client", "overview"],
    queryFn: async () => (await api.get("/clients/me/overview")).data,
  });
  const s = data?.stats;
  const t = data?.trends ?? {};
  const sp = data?.sparks ?? {};
  const k = data?.kpis;

  return (
    <div className="space-y-3">
      {/* Command-bar hero — dense with live pulse */}
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
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">بوابة العميل</div>
              <h1 className="text-base md:text-lg font-black truncate">
                مرحباً <span className="text-electric">{user?.name?.split(" ")[0] ?? "بك"}</span> 👋
              </h1>
            </div>
          </div>
          <div className="h-px lg:h-9 lg:w-px bg-border/60" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
            <PulseStat label="مشاريع نشطة" value={s?.activeProjects ?? 0} color="electric" />
            <PulseStat label="فواتير مستحقة" value={s?.unpaidInvoices ?? 0} color="amber" />
            <PulseStat label="تذاكر مفتوحة" value={s?.openTickets ?? 0} color="rose" />
            <PulseStat label="إشعارات" value={s?.unreadNotifications ?? 0} color="emerald" />
          </div>
          <div className="flex gap-1.5 shrink-0">
            <QuickAction icon={Plus} to="/client/projects" label="مشروع" />
            <QuickAction icon={Upload} to="/client/files" label="رفع" />
            <QuickAction icon={HelpCircle} to="/client/support" label="دعم" />
          </div>
        </div>
      </motion.div>

      {/* Row 2: 6 compact metric chips */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <MetricChip icon={FolderKanban} label="مشاريع" value={s?.activeProjects ?? 0} loading={isLoading} accent="electric" trend={t.projects} spark={sp.projects} />
        <MetricChip icon={Boxes} label="خدمات" value={s?.activeServices ?? 0} loading={isLoading} accent="purple" />
        <MetricChip icon={FileText} label="فواتير" value={s?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" trend={t.invoices} spark={sp.invoices} />
        <MetricChip icon={ScrollText} label="عقود" value={s?.pendingContracts ?? 0} loading={isLoading} accent="cyan" />
        <MetricChip icon={LifeBuoy} label="تذاكر" value={s?.openTickets ?? 0} loading={isLoading} accent="rose" trend={t.tickets} spark={sp.tickets} />
        <MetricChip icon={Bell} label="إشعارات" value={s?.unreadNotifications ?? 0} loading={isLoading} accent="emerald" trend={t.notifications} spark={sp.notifications} />
      </div>

      {/* Row 3: Spending chart (8) + Financial rings (4) */}
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold">مصروفاتك الشهرية</h3>
              <p className="text-[10px] text-muted-foreground">آخر 6 أشهر</p>
            </div>
          </div>
          <div className="h-56">
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
          </div>
        </div>

        <div className="lg:col-span-4 grid gap-2">
          <RingKpi label="مؤشر الرضا" value={`${k?.satisfactionScore ?? 0}%`} progress={k?.satisfactionScore ?? 0} color="purple" sub="من تفاعلك مع الخدمات" />
          <div className="rounded-xl border border-border bg-card p-3">
            <h4 className="text-[11px] font-bold text-muted-foreground mb-2">توزيع الفواتير</h4>
            <div className="flex items-center gap-2">
              <div className="h-20 w-20 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data?.invoiceBreakdown ?? []} dataKey="count" nameKey="status" innerRadius={22} outerRadius={38} paddingAngle={2} strokeWidth={0}>
                      {(data?.invoiceBreakdown ?? []).map((_: unknown, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                {(data?.invoiceBreakdown ?? []).slice(0, 4).map((b: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate">{b.status}</span>
                    </span>
                    <span className="font-bold shrink-0">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <FinMini icon={Wallet} label="مدفوع" value={<Money value={k?.totalSpent ?? 0} />} color="emerald" />
            <FinMini icon={Clock} label="معلق" value={<Money value={k?.pendingAmount ?? 0} />} color="amber" />
            <FinMini icon={AlertTriangle} label="متأخر" value={<Money value={k?.overdueAmount ?? 0} />} color="rose" />
          </div>
        </div>
      </div>

      {/* Row 4: Upcoming payments (6) + Project progress (6) */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" />مدفوعات قادمة</h3>
            <Link to="/client/invoices" className="text-[10px] text-electric hover:underline">الكل ←</Link>
          </div>
          <div className="space-y-1.5">
            {(data?.upcomingPayments ?? []).length === 0 && !isLoading && (
              <div className="text-[11px] text-muted-foreground text-center py-4">لا توجد فواتير مستحقة 🎉</div>
            )}
            {(data?.upcomingPayments ?? []).slice(0, 5).map((p: any) => {
              const overdue = p.daysLeft < 0;
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/20 px-2.5 py-2 hover:bg-muted/40 transition">
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold" dir="ltr">{p.invoiceNumber}</div>
                    <div className={`text-[10px] ${overdue ? "text-rose-400 font-semibold" : "text-muted-foreground"}`}>
                      {overdue ? `متأخر ${Math.abs(p.daysLeft)} يوم` : `خلال ${p.daysLeft} يوم`} · {formatDate(p.dueDate)}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <Money value={p.amount} className="text-[12px] font-bold" />
                    <StatusBadge value={p.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5"><FolderKanban className="h-3.5 w-3.5 text-electric" />تقدم المشاريع</h3>
            <Link to="/client/projects" className="text-[10px] text-electric hover:underline">الكل ←</Link>
          </div>
          <div className="space-y-1.5">
            {(data?.projectProgress ?? []).length === 0 && !isLoading && (
              <div className="text-[11px] text-muted-foreground text-center py-4">لا توجد مشاريع بعد</div>
            )}
            {(data?.projectProgress ?? []).slice(0, 5).map((p: any) => (
              <div key={p.id} className="rounded-lg bg-muted/20 px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">يستحق {formatDate(p.dueDate)}</div>
                  </div>
                  <div className="text-left shrink-0 flex items-center gap-2">
                    <span className="text-[11px] font-black">{p.progress}%</span>
                    <StatusBadge value={p.status} />
                  </div>
                </div>
                <Progress value={p.progress} className="h-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Activity ticker (7) + Files (5) */}
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-3.5">
          <h3 className="text-sm font-bold flex items-center gap-1.5 mb-2"><Activity className="h-3.5 w-3.5 text-purple-accent" />آخر النشاطات</h3>
          <div className="space-y-2">
            {(data?.recentActivity ?? []).length === 0 && !isLoading && (
              <div className="text-[11px] text-muted-foreground text-center py-4">لا يوجد نشاط بعد</div>
            )}
            {(data?.recentActivity ?? []).slice(0, 6).map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-electric/10 text-electric shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px]">{a.message}</div>
                  <div className="text-[10px] text-muted-foreground">{fromNow(a.time)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5"><Files className="h-3.5 w-3.5" />آخر الملفات</h3>
            <Link to="/client/files" className="text-[10px] text-electric hover:underline">الكل ←</Link>
          </div>
          <div className="space-y-1.5">
            {(data?.recentFiles ?? []).length === 0 && !isLoading && (
              <div className="text-[11px] text-muted-foreground text-center py-4">لا توجد ملفات</div>
            )}
            {(data?.recentFiles ?? []).slice(0, 5).map((f: any) => (
              <a key={f.id} href={f.path} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-2 hover:bg-muted/40 transition">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-electric/10 text-electric shrink-0"><FileText className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate">{f.originalName}</div>
                  <div className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB · {formatDate(f.createdAt)}</div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {(k?.satisfactionScore ?? 0) >= 80 && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-[11px] text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          أداء ممتاز! تفاعلك مع الخدمات فوق المتوسط.
        </div>
      )}
    </div>
  );
}

function PulseStat({ label, value, color }: { label: string; value: React.ReactNode; color: "emerald" | "electric" | "amber" | "rose" }) {
  const dot: Record<string, string> = {
    emerald: "bg-emerald-400", electric: "bg-electric", amber: "bg-amber-400", rose: "bg-rose-400",
  };
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot[color]}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        <div className="text-sm font-black truncate">{value}</div>
      </div>
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

function FinMini({ icon: Icon, label, value, color }: { icon: any; label: string; value: React.ReactNode; color: "emerald" | "amber" | "rose" }) {
  const c: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    rose: "bg-rose-500/10 text-rose-400",
  };
  return (
    <div className="rounded-lg border border-border bg-card px-2 py-1.5">
      <div className="flex items-center gap-1 mb-0.5">
        <span className={`grid h-4 w-4 place-items-center rounded ${c[color]}`}>
          <Icon className="h-2.5 w-2.5" />
        </span>
        <span className="text-[9px] text-muted-foreground truncate">{label}</span>
      </div>
      <div className="text-[11px] font-black truncate">{value}</div>
    </div>
  );
}
