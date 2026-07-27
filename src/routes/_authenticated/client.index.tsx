import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FolderKanban, Boxes, FileText, ScrollText, LifeBuoy, Bell, Files,
  Wallet, AlertTriangle, Clock, Sparkles, Activity, ArrowUpRight, CheckCircle2,
  Plus, Upload, HelpCircle, Zap, Trophy, TrendingUp, Sun, Moon, CloudSun,
  Command, Search, Crown, Gift, Target, Rocket, ShieldCheck, Calendar,
  MessageCircle, Star, ChevronLeft, ChevronRight, Megaphone,
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

/* ---------- Small building blocks ---------- */

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

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-full w-full grid place-items-center rounded-lg border border-dashed border-border/70 bg-foreground/[0.02]">
      <div className="text-center px-4">
        <Sparkles className="h-5 w-5 text-foreground/40 mx-auto mb-1.5" />
        <div className="text-[11px] text-foreground/60">{label}</div>
      </div>
    </div>
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

/* ---------- Enhanced hero helpers ---------- */

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function greetingFor(hour: number) {
  if (hour < 5) return { text: "ليلة هادئة", Icon: Moon, tone: "text-indigo-300" };
  if (hour < 12) return { text: "صباح الخير", Icon: Sun, tone: "text-amber-300" };
  if (hour < 17) return { text: "نهارك مبارك", Icon: CloudSun, tone: "text-cyan-300" };
  if (hour < 21) return { text: "مساء الخير", Icon: CloudSun, tone: "text-orange-300" };
  return { text: "مساء الهدوء", Icon: Moon, tone: "text-indigo-300" };
}

function tierFor(spent: number) {
  if (spent >= 100_000) return { label: "Platinum", Icon: Crown, tone: "from-slate-300/30 to-slate-500/20 text-slate-100 border-slate-300/40" };
  if (spent >= 25_000) return { label: "Gold", Icon: Trophy, tone: "from-amber-400/30 to-amber-600/20 text-amber-200 border-amber-400/40" };
  if (spent >= 5_000) return { label: "Silver", Icon: Star, tone: "from-zinc-300/30 to-zinc-500/20 text-zinc-100 border-zinc-300/40" };
  return { label: "Starter", Icon: Rocket, tone: "from-electric/30 to-purple-accent/20 text-electric border-electric/40" };
}

const TIPS = [
  { icon: ShieldCheck, text: "فعّل التحقق بخطوتين لحماية حسابك.", to: "/client/profile" },
  { icon: FileText, text: "راجع فواتيرك المستحقة وسددها قبل تاريخ الاستحقاق.", to: "/client/invoices" },
  { icon: MessageCircle, text: "افتح تذكرة دعم لأي استفسار — نرد خلال 30 دقيقة.", to: "/client/support" },
  { icon: Upload, text: "ارفع ملفاتك ومراجعك ليصل فريقنا للمعلومات بسرعة.", to: "/client/files" },
  { icon: Target, text: "تابع تقدم مشاريعك لحظة بلحظة من قسم المشاريع.", to: "/client/projects" },
];

/* ---------- Main ---------- */

function ClientOverview() {
  const { user } = useAuth();
  const now = useNow();
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
  const spendingSeries = (data?.spendingMonths ?? []) as any[];
  const hasSpending = spendingSeries.some((x) => (x?.amount ?? 0) > 0);

  const greet = greetingFor(now.getHours());
  const tier = tierFor(k?.totalSpent ?? 0);
  const nextTierAt = (k?.totalSpent ?? 0) >= 100_000 ? null : (k?.totalSpent ?? 0) >= 25_000 ? 100_000 : (k?.totalSpent ?? 0) >= 5_000 ? 25_000 : 5_000;
  const tierPct = nextTierAt ? Math.min(100, Math.round(((k?.totalSpent ?? 0) / nextTierAt) * 100)) : 100;

  // Onboarding / next-steps checklist based on live data
  const steps = useMemo(() => ([
    { label: "أكمل ملفك الشخصي", done: !!(user?.name && user?.phone), to: "/client/profile", icon: ShieldCheck },
    { label: "استعرض خدماتك", done: (s?.activeServices ?? 0) > 0, to: "/client/services", icon: Boxes },
    { label: "راجع مشاريعك النشطة", done: (s?.activeProjects ?? 0) > 0, to: "/client/projects", icon: FolderKanban },
    { label: "سدّد الفواتير المستحقة", done: (s?.unpaidInvoices ?? 0) === 0, to: "/client/invoices", icon: Wallet },
    { label: "وقّع العقود المعلقة", done: (s?.pendingContracts ?? 0) === 0, to: "/client/contracts", icon: ScrollText },
  ]), [s, user]);
  const doneCount = steps.filter((x) => x.done).length;
  const stepsPct = Math.round((doneCount / steps.length) * 100);

  // Tips carousel
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const dateStr = new Intl.DateTimeFormat("ar-SA", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const timeStr = new Intl.DateTimeFormat("ar-SA", { hour: "2-digit", minute: "2-digit" }).format(now);

  return (
    <div className="space-y-4">
      {/* ============ Cinematic Welcome Hero ============ */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-electric/15 via-card to-purple-accent/15 p-4 sm:p-5"
      >
        {/* animated blobs */}
        <motion.div
          aria-hidden
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-electric/20 blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-accent/20 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, -15, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.15),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(168,85,247,0.15),transparent_50%)]" />

        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] items-center">
          {/* Left: greeting + tier */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-gradient-to-br from-electric to-purple-accent text-white font-black text-lg sm:text-xl shadow-lg shadow-electric/20">
                {(user?.name?.trim()?.[0] ?? "A").toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 border-2 border-card">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-foreground/70">
                <greet.Icon className={`h-3 w-3 ${greet.tone}`} />
                {greet.text} · بوابة العميل
              </div>
              <h1 className="mt-0.5 text-lg sm:text-2xl font-black tracking-tight truncate">
                أهلاً <span className="bg-gradient-to-r from-electric to-purple-accent bg-clip-text text-transparent">{user?.name?.split(" ")[0] ?? "بك"}</span>{" "}
                <motion.span className="inline-block" animate={{ rotate: [0, 14, -8, 14, 0] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 4 }}>👋</motion.span>
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border bg-gradient-to-r ${tier.tone} px-2 py-0.5 text-[10px] font-bold`}>
                  <tier.Icon className="h-3 w-3" />
                  عضوية {tier.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] text-foreground/80">
                  <Calendar className="h-3 w-3" /> {dateStr}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] font-mono tabular-nums text-foreground/80">
                  <Clock className="h-3 w-3" /> {timeStr}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  مباشر · 15ث
                </span>
              </div>
            </div>
          </div>

          {/* Right: tier progress + quick actions */}
          <div className="flex flex-col gap-2 min-w-[240px]">
            {nextTierAt && (
              <div className="rounded-xl border border-border bg-background/40 backdrop-blur px-3 py-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="inline-flex items-center gap-1 text-foreground/80"><Gift className="h-3 w-3 text-amber-400" /> تقدّم للترقية</span>
                  <span className="font-black">{tierPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tierPct}%` }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-electric"
                  />
                </div>
                <div className="mt-1 text-[10px] text-foreground/60">
                  {moneyText(Math.max(0, nextTierAt - (k?.totalSpent ?? 0)))} تفصلك عن المستوى التالي
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              <QuickAction icon={Plus} to="/client/projects" label="مشروع" />
              <QuickAction icon={Upload} to="/client/files" label="رفع" />
              <QuickAction icon={HelpCircle} to="/client/support" label="دعم" />
              <span className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-border bg-background/40 px-2 py-1.5 text-[10px] text-foreground/70 font-mono">
                <Command className="h-3 w-3" /> K
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ============ Announcements ticker + Tips carousel ============ */}
      <div className="grid gap-3 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 overflow-hidden"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <Megaphone className="h-4 w-4" />
          </span>
          <div className="relative flex-1 overflow-hidden">
            <motion.div
              className="whitespace-nowrap text-[12px] font-semibold text-foreground/80"
              animate={{ x: ["100%", "-100%"] }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            >
              🎉 عرض خاص: خصم 15% على تجديد الاستضافة السنوي · 🚀 أطلقنا قسم الدعم الفوري عبر واتساب · 🛡️ تفعيل التحقق بخطوتين متاح الآن · 💎 برنامج الولاء الجديد يمنحك نقاط مع كل فاتورة
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tipIdx}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-purple-accent/30 bg-gradient-to-l from-purple-accent/10 to-card px-3 py-2.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              {(() => { const I = TIPS[tipIdx].icon; return <I className="h-4 w-4 text-purple-accent shrink-0" />; })()}
              <div className="text-[11px] text-foreground/85 flex-1 truncate">{TIPS[tipIdx].text}</div>
              <Link to={TIPS[tipIdx].to as never} className="text-[10px] font-bold text-electric hover:underline shrink-0">افتح ←</Link>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {TIPS.map((_, i) => (
                <button key={i} onClick={() => setTipIdx(i)} aria-label={`نصيحة ${i + 1}`}
                  className={`h-1 rounded-full transition-all ${i === tipIdx ? "w-6 bg-purple-accent" : "w-2 bg-foreground/20"}`} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Row 1 — 6 MetricChips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <MetricChip icon={FolderKanban} label="مشاريع نشطة" value={s?.activeProjects ?? 0} loading={isLoading} accent="electric" trend={t.projects} spark={sp.projects} />
        <MetricChip icon={Boxes} label="خدمات" value={s?.activeServices ?? 0} loading={isLoading} accent="purple" />
        <MetricChip icon={FileText} label="فواتير مستحقة" value={s?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" trend={t.invoices} spark={sp.invoices} />
        <MetricChip icon={ScrollText} label="عقود معلقة" value={s?.pendingContracts ?? 0} loading={isLoading} accent="cyan" />
        <MetricChip icon={LifeBuoy} label="تذاكر" value={s?.openTickets ?? 0} loading={isLoading} accent="rose" trend={t.tickets} spark={sp.tickets} />
        <MetricChip icon={Bell} label="إشعارات" value={s?.unreadNotifications ?? 0} loading={isLoading} accent="emerald" trend={t.notifications} spark={sp.notifications} />
      </div>

      {/* Row 2 — Financial KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <MetricChip icon={Wallet} label="إجمالي مدفوع" value={<Money value={k?.totalSpent ?? 0} />} accent="emerald" loading={isLoading} hint="مجموع دفعاتك" />
        <MetricChip icon={Clock} label="مبالغ معلقة" value={<Money value={k?.pendingAmount ?? 0} />} accent="amber" loading={isLoading} hint="بانتظار السداد" />
        <MetricChip icon={AlertTriangle} label="مبالغ متأخرة" value={<Money value={k?.overdueAmount ?? 0} />} accent="rose" loading={isLoading} hint="بحاجة اهتمام" />
        <MetricChip icon={Trophy} label="مؤشر الرضا" value={`${k?.satisfactionScore ?? 0}%`} accent="purple" loading={isLoading} hint="من تفاعلك مع الخدمات" />
      </div>

      {/* Row 2.5 — Next steps checklist + Health ring */}
      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          title="خطواتك التالية"
          icon={Target}
          iconColor="text-electric"
          action={<span className="text-[10px] font-bold text-electric">{doneCount}/{steps.length} مكتملة</span>}
        >
          <div className="mb-2.5 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stepsPct}%` }}
              className="h-full bg-gradient-to-r from-electric to-emerald-400" />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {steps.map((st) => (
              <Link key={st.label} to={st.to as never}
                className={`group flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition ${
                  st.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-foreground/[0.03] hover:bg-foreground/10"
                }`}>
                <span className={`grid h-7 w-7 place-items-center rounded-lg shrink-0 ${
                  st.done ? "bg-emerald-500/20 text-emerald-400" : "bg-electric/10 text-electric"
                }`}>
                  {st.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <st.icon className="h-3.5 w-3.5" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[12px] font-semibold truncate ${st.done ? "line-through text-foreground/60" : ""}`}>{st.label}</div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground/40 group-hover:text-electric shrink-0" />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel
          className="xl:col-span-4"
          title="صحّة حسابك"
          icon={ShieldCheck}
          iconColor="text-emerald-400"
        >
          <div className="flex items-center gap-4 h-full">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/25" />
                <motion.circle
                  cx="50" cy="50" r="42" stroke="url(#healthGrad)" strokeWidth="8" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(stepsPct / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                  initial={{ strokeDasharray: `0 ${2 * Math.PI * 42}` }}
                  animate={{ strokeDasharray: `${(stepsPct / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-lg font-black leading-none">{stepsPct}%</div>
                  <div className="text-[9px] text-foreground/60">جاهزية</div>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground/70">ملف مكتمل</span>
                <span className="font-bold">{steps[0].done ? "✓" : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground/70">لا فواتير متأخرة</span>
                <span className={`font-bold ${(k?.overdueAmount ?? 0) > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {(k?.overdueAmount ?? 0) > 0 ? "!" : "✓"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground/70">عقود موقّعة</span>
                <span className="font-bold">{steps[4].done ? "✓" : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground/70">تذاكر مفتوحة</span>
                <span className={`font-bold ${(s?.openTickets ?? 0) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {s?.openTickets ?? 0}
                </span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 3 — Spending chart + Invoice donut */}
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
            ) : !hasSpending ? (
              <EmptyChart label="لا توجد مصروفات لعرضها بعد — ستظهر مع أول فاتورة مسددة" />
            ) : (
              <ResponsiveContainer>
                <AreaChart data={spendingSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
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
              ) : totalInvoice === 0 ? (
                <div className="h-40 w-40 rounded-full border-[14px] border-dashed border-border grid place-items-center text-[10px] text-foreground/50 text-center px-2">
                  لا توجد فواتير بعد
                </div>
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
                : (data?.invoiceBreakdown ?? []).length === 0
                  ? <div className="text-[11px] text-foreground/60">ستظهر التقسيمة عند إصدار أول فاتورة.</div>
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

      {/* Row 4 — Upcoming payments + Project progress */}
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

      {/* Row 5 — Activity + Files */}
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-[11px] text-emerald-300"
        >
          <Sparkles className="h-3.5 w-3.5" />
          أداء ممتاز! تفاعلك مع الخدمات فوق المتوسط.
        </motion.div>
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
    <Link to={to as never} className="inline-flex items-center gap-1 rounded-lg bg-electric/10 hover:bg-electric/20 text-electric px-2.5 py-1.5 text-[10px] font-bold transition">
      <Icon className="h-3 w-3" />
      {label}
    </Link>
  );
}
