import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  TrendingUp, MousePointerClick, Users, Link2, Sparkles,
  Wallet, ArrowUpRight, BadgeDollarSign, Clock, CheckCircle2, Check, Copy,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/affiliate/")({
  component: Dashboard,
});

type Dashboard = {
  affiliate: { code: string; displayName: string; status: string };
  metrics: {
    clicks: { total: number; unique: number; last30: number };
    customers: number; links: number; campaigns: number; notificationsUnread: number;
  };
  balances: { pending: number; available: number; reserved: number; paid: number; withdrawable: number };
  commissions: Record<string, { amount: number; count: number }>;
  recent: Array<{ id: string; amount: string | number; status: string; orderRef?: string | null; createdAt: string; holdUntil?: string | null }>;
};

function fmt(n: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(n);
}

function Dashboard() {
  const [copied, setCopied] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-dashboard"],
    queryFn: async () => (await api.get("/affiliate/dashboard")).data as Dashboard,
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const referralUrl = `${window.location.origin}/?ref=${data.affiliate.code}`;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 md:p-8"
      >
        <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-glow">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-amber-500 font-semibold">شريك معتمد · مفعّل</div>
            <div className="text-2xl md:text-3xl font-bold">مرحباً {data.affiliate.displayName} 👋</div>
            <div className="text-sm text-muted-foreground mt-1">
              كود الإحالة: <span className="font-mono font-bold text-foreground">{data.affiliate.code}</span>
            </div>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(referralUrl); }}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:opacity-90"
          >
            نسخ رابط الإحالة
          </button>
        </div>
      </motion.section>

      {/* Balances */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "قابل للسحب", value: data.balances.withdrawable, icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "معلّق", value: data.balances.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "متاح", value: data.balances.available, icon: BadgeDollarSign, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "مدفوع", value: data.balances.paid, icon: CheckCircle2, color: "text-slate-400", bg: "bg-slate-500/10" },
        ].map((c, i) => (
          <motion.div key={c.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className={`grid h-8 w-8 place-items-center rounded-lg ${c.bg}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums">{fmt(c.value)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">ريال سعودي</div>
          </motion.div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "النقرات (30 يوم)", value: data.metrics.clicks.last30, icon: MousePointerClick },
          { label: "نقرات فريدة", value: data.metrics.clicks.unique, icon: TrendingUp },
          { label: "عملاء مُحالون", value: data.metrics.customers, icon: Users },
          { label: "روابط نشطة", value: data.metrics.links, icon: Link2 },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className="h-4 w-4 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
            <div className="text-2xl font-bold tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Recent commissions */}
      <section className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">آخر العمولات</h2>
          <Link to="/affiliate/commissions" className="text-xs text-amber-500 flex items-center gap-1">
            عرض الكل <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">لا توجد عمولات بعد. شارك رابطك لبدء الكسب!</div>
        ) : (
          <div className="space-y-2">
            {data.recent.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div>
                  <div className="text-sm font-semibold">{c.orderRef || "طلب #" + c.id.slice(-6)}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{c.status}</div>
                  <div className="text-sm font-bold tabular-nums">{fmt(Number(c.amount))} ر.س</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
