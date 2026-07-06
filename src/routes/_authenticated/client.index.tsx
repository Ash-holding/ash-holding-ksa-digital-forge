import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LayoutDashboard, FolderKanban, Boxes, FileText, ScrollText, LifeBuoy, Bell, Files,
  Wallet, AlertTriangle, Clock, Sparkles, Activity, ArrowUpRight, CheckCircle2,
  Plus, Upload, HelpCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate, fromNow } from "@/lib/format";
import { Money, moneyText } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/client/")({
  component: ClientOverview,
});

const PIE_COLORS = ["#10b981", "#f59e0b", "#f43f5e"];
const tooltipStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, direction: "rtl" as const, fontSize: 12 };

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
    <>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-electric/15 via-transparent to-purple-accent/15 p-5 md:p-6">
          <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-electric/20 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-purple-accent/20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-2"><LayoutDashboard className="h-3.5 w-3.5" />بوابة العميل</div>
              <h1 className="mt-1 text-xl md:text-2xl font-black">
                مرحباً {user?.name?.split(" ")[0] ?? "بك"} 👋
              </h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-lg">
                تابع مشاريعك، مصروفاتك، عقودك، وتذاكر الدعم من مكان واحد. لديك <span className="font-bold text-foreground">{s?.activeProjects ?? 0}</span> مشروع نشط و<span className="font-bold text-foreground">{s?.unpaidInvoices ?? 0}</span> فاتورة بانتظار الدفع.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickAction icon={Plus} label="مشروع جديد" to="/client/projects" color="electric" />
              <QuickAction icon={Upload} label="رفع ملف" to="/client/files" color="purple" />
              <QuickAction icon={HelpCircle} label="فتح تذكرة" to="/client/support" color="rose" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={FolderKanban} label="مشاريع نشطة" value={s?.activeProjects ?? 0} loading={isLoading} accent="electric" trend={t.projects} spark={sp.projects} />
        <StatCard icon={Boxes} label="خدمات نشطة" value={s?.activeServices ?? 0} loading={isLoading} accent="purple" />
        <StatCard icon={FileText} label="فواتير مستحقة" value={s?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" trend={t.invoices} spark={sp.invoices} />
        <StatCard icon={ScrollText} label="عقود بانتظار التوقيع" value={s?.pendingContracts ?? 0} loading={isLoading} accent="cyan" />
        <StatCard icon={LifeBuoy} label="تذاكر مفتوحة" value={s?.openTickets ?? 0} loading={isLoading} accent="rose" trend={t.tickets} spark={sp.tickets} />
        <StatCard icon={Bell} label="إشعارات جديدة" value={s?.unreadNotifications ?? 0} loading={isLoading} accent="emerald" trend={t.notifications} spark={sp.notifications} />
      </div>

      {/* Financial KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FinTile icon={Wallet} label="إجمالي المدفوع" value={<Money value={k?.totalSpent ?? 0} />} color="emerald" />
        <FinTile icon={Clock} label="مستحقات معلقة" value={<Money value={k?.pendingAmount ?? 0} />} color="amber" />
        <FinTile icon={AlertTriangle} label="مبالغ متأخرة" value={<Money value={k?.overdueAmount ?? 0} />} color="rose" />
        <FinTile icon={Sparkles} label="مؤشر الرضا" value={`${k?.satisfactionScore ?? 0}%`} progress={k?.satisfactionScore} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold">مصروفاتك الشهرية</h3>
              <p className="text-[11px] text-muted-foreground">آخر 6 أشهر · ريال سعودي</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data?.spendingMonths ?? []}>
                <defs>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} reversed />
                <YAxis stroke="#94a3b8" fontSize={11} orientation="right" tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => moneyText(v)} />
                <Area type="monotone" dataKey="amount" name="المصروفات" stroke="#a855f7" strokeWidth={2.5} fill="url(#spendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <h3 className="font-bold mb-1">توزيع الفواتير</h3>
          <p className="text-[11px] text-muted-foreground mb-2">حسب الحالة</p>
          <div className="h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data?.invoiceBreakdown ?? []} dataKey="count" nameKey="status" innerRadius={40} outerRadius={75} paddingAngle={3}>
                  {(data?.invoiceBreakdown ?? []).map((_: unknown, i: number) => (
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

      {/* Upcoming payments + project progress */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" />مدفوعات قادمة</h3>
            <Link to="/client/invoices" className="text-xs text-electric hover:underline">كل الفواتير ←</Link>
          </div>
          <div className="space-y-2">
            {(data?.upcomingPayments ?? []).length === 0 && !isLoading && (
              <div className="text-xs text-muted-foreground text-center py-6">لا توجد فواتير مستحقة 🎉</div>
            )}
            {(data?.upcomingPayments ?? []).map((p: any) => {
              const overdue = p.daysLeft < 0;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/20 p-3 hover:bg-muted/40 transition">
                  <div className="min-w-0">
                    <div className="text-sm font-bold" dir="ltr">{p.invoiceNumber}</div>
                    <div className={`text-[11px] ${overdue ? "text-rose-400 font-semibold" : "text-muted-foreground"}`}>
                      {overdue ? `متأخر بـ ${Math.abs(p.daysLeft)} يوم` : `يستحق خلال ${p.daysLeft} يوم`} · {formatDate(p.dueDate)}
                    </div>
                  </div>
                  <div className="text-left">
                    <Money value={p.amount} className="text-sm font-bold" />
                    <StatusBadge value={p.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2"><FolderKanban className="h-4 w-4 text-electric" />تقدم المشاريع</h3>
            <Link to="/client/projects" className="text-xs text-electric hover:underline">كل المشاريع ←</Link>
          </div>
          <div className="space-y-3">
            {(data?.projectProgress ?? []).length === 0 && !isLoading && (
              <div className="text-xs text-muted-foreground text-center py-6">لا توجد مشاريع بعد</div>
            )}
            {(data?.projectProgress ?? []).map((p: any) => (
              <div key={p.id} className="rounded-xl bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">يستحق {formatDate(p.dueDate)}</div>
                  </div>
                  <div className="text-left shrink-0">
                    <StatusBadge value={p.status} />
                    <div className="text-[11px] font-bold mt-1">{p.progress}%</div>
                  </div>
                </div>
                <Progress value={p.progress} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity feed + recent files */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-purple-accent" />آخر النشاطات</h3>
          <div className="space-y-3">
            {(data?.recentActivity ?? []).length === 0 && !isLoading && (
              <div className="text-xs text-muted-foreground text-center py-6">لا يوجد نشاط بعد</div>
            )}
            {(data?.recentActivity ?? []).map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-electric/10 text-electric shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{a.message}</div>
                  <div className="text-[11px] text-muted-foreground">{fromNow(a.time)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-2"><Files className="h-4 w-4" />آخر الملفات</h3>
            <Link to="/client/files" className="text-xs text-electric hover:underline">الكل ←</Link>
          </div>
          <div className="space-y-2">
            {(data?.recentFiles ?? []).length === 0 && !isLoading && (
              <div className="text-xs text-muted-foreground text-center py-6">لا توجد ملفات بعد</div>
            )}
            {(data?.recentFiles ?? []).map((f: any) => (
              <a key={f.id} href={f.path} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-muted/20 p-3 hover:bg-muted/40 transition">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-electric/10 text-electric shrink-0"><FileText className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{f.originalName}</div>
                  <div className="text-[11px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB · {formatDate(f.createdAt)}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function QuickAction({ icon: Icon, label, to, color }: { icon: any; label: string; to: string; color: "electric" | "purple" | "rose" }) {
  const colors: Record<string, string> = {
    electric: "bg-electric text-white hover:bg-electric/90",
    purple: "bg-purple-accent text-white hover:bg-purple-accent/90",
    rose: "bg-rose-500 text-white hover:bg-rose-500/90",
  };
  return (
    <Link to={to as never} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold shadow-lg transition ${colors[color]}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

function FinTile({ icon: Icon, label, value, progress, color }: { icon: any; label: string; value: React.ReactNode; progress?: number; color: "emerald" | "amber" | "rose" | "purple" }) {
  const colors: Record<string, { chip: string; bar: string }> = {
    emerald: { chip: "bg-emerald-500/10 text-emerald-400", bar: "bg-emerald-500" },
    amber: { chip: "bg-amber-500/10 text-amber-400", bar: "bg-amber-500" },
    rose: { chip: "bg-rose-500/10 text-rose-400", bar: "bg-rose-500" },
    purple: { chip: "bg-purple-accent/10 text-purple-accent", bar: "bg-purple-accent" },
  };
  const c = colors[color];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${c.chip}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="text-xl font-black">{value}</div>
      {typeof progress === "number" && (
        <div className="mt-2 h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div className={`h-full ${c.bar} transition-all`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
    </div>
  );
}
