import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes, Activity, PauseCircle, RefreshCw, Wallet, Layers, Search, AlertTriangle,
  Globe, Smartphone, Server, Mail, Megaphone, Palette, LifeBuoy, HardDrive, Package,
  Clock, Inbox, ClipboardList, Plus, ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { LiveBadge, DueBadge } from "@/components/client/LiveBadge";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";
import { ServiceCatalog } from "@/components/client/ServiceCatalog";

const TYPE_AR: Record<string, string> = { WEBSITE:"موقع", MOBILE_APP:"تطبيق", ADMIN_SYSTEM:"نظام", HOSTING:"استضافة", VPS:"VPS", DEDICATED_SERVER:"سيرفر", SMTP:"SMTP", MARKETING:"تسويق", DESIGN:"تصميم", SUPPORT:"دعم", OTHER:"أخرى" };
const TYPE_ICON: Record<string, any> = { WEBSITE: Globe, MOBILE_APP: Smartphone, ADMIN_SYSTEM: Server, HOSTING: HardDrive, VPS: Server, DEDICATED_SERVER: Server, SMTP: Mail, MARKETING: Megaphone, DESIGN: Palette, SUPPORT: LifeBuoy, OTHER: Package };
const TYPE_TONE: Record<string, string> = { WEBSITE: "text-electric bg-electric/10", MOBILE_APP: "text-purple-accent bg-purple-accent/10", ADMIN_SYSTEM: "text-cyan-400 bg-cyan-500/10", HOSTING: "text-emerald-400 bg-emerald-500/10", VPS: "text-emerald-400 bg-emerald-500/10", DEDICATED_SERVER: "text-emerald-400 bg-emerald-500/10", SMTP: "text-amber-400 bg-amber-500/10", MARKETING: "text-rose-400 bg-rose-500/10", DESIGN: "text-purple-accent bg-purple-accent/10", SUPPORT: "text-cyan-400 bg-cyan-500/10", OTHER: "text-muted-foreground bg-muted/40" };

const KIND_LABEL: Record<string, string> = {
  NEW_SUBSCRIPTION: "اشتراك جديد",
  QUOTE_REQUEST: "طلب تسعير",
  RENEWAL_UPGRADE: "تجديد/ترقية",
};

export const Route = createFileRoute("/_authenticated/client/services")({
  component: ClientServicesPage,
});

type TabKey = "subscriptions" | "requests";

function ClientServicesPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<TabKey>("subscriptions");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [reqStatus, setReqStatus] = useState<string | null>(null);
  const [reqQ, setReqQ] = useState("");

  const list = useQuery({
    queryKey: ["client-services", page],
    queryFn: async () => (await api.get("/services", { params: { page } })).data,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  const reqList = useQuery({
    queryKey: ["client-service-requests"],
    queryFn: async () => (await api.get("/service-requests")).data,
    refetchInterval: 15000,
  });

  const rows = (list.data?.rows ?? []) as any[];
  const reqRows = (reqList.data?.rows ?? []) as any[];

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const paused = rows.filter((r) => r.status === "PAUSED").length;
    const now = Date.now();
    const soon = now + 30 * 86400000;
    const renewingSoon = rows.filter((r) => r.renewalDate && new Date(r.renewalDate).getTime() < soon && new Date(r.renewalDate).getTime() >= now).length;
    const overdueRenewal = rows.filter((r) => r.renewalDate && new Date(r.renewalDate).getTime() < now && r.status !== "CANCELLED").length;
    const monthly = rows.reduce((s, r) => s + Number(r.price ?? 0), 0);
    const byType = new Map<string, number>();
    rows.forEach((r) => byType.set(r.type, (byType.get(r.type) ?? 0) + 1));
    const topTypes = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { total, active, paused, renewingSoon, overdueRenewal, monthly, topTypes };
  }, [rows]);

  const reqStats = useMemo(() => {
    const c: Record<string, number> = { total: reqRows.length };
    for (const r of reqRows) c[r.status] = (c[r.status] ?? 0) + 1;
    const pending = (c.SUBMITTED ?? 0) + (c.UNDER_REVIEW ?? 0);
    const awaitingPayment = c.AWAITING_PAYMENT ?? 0;
    const active = c.ACTIVE ?? 0;
    return { total: reqRows.length, pending, awaitingPayment, active, quoted: c.QUOTED ?? 0, counts: c };
  }, [reqRows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (status) out = out.filter((r) => r.status === status);
    if (type) out = out.filter((r) => r.type === type);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      out = out.filter((r) => (r.name || "").toLowerCase().includes(s));
    }
    return out.sort((a, b) => new Date(a.renewalDate || 0).getTime() - new Date(b.renewalDate || 0).getTime());
  }, [rows, status, type, q]);

  const filteredReqs = useMemo(() => {
    let out = reqRows;
    if (reqStatus) out = out.filter((r) => r.status === reqStatus);
    if (reqQ.trim()) {
      const s = reqQ.toLowerCase();
      out = out.filter((r) => `${r.title ?? ""} ${r.code ?? ""} ${r.notes ?? ""}`.toLowerCase().includes(s));
    }
    return [...out].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reqRows, reqStatus, reqQ]);

  const columns: Column<any>[] = [
    { key: "name", header: "الخدمة", render: (r) => {
      const Icon = TYPE_ICON[r.type] || Package;
      return (
        <div className="flex items-center gap-2 min-w-0">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TYPE_TONE[r.type] || "bg-muted/40"}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="font-semibold truncate">{r.name}</div>
            <div className="text-[10px] text-muted-foreground">{TYPE_AR[r.type] || r.type}</div>
          </div>
        </div>
      );
    } },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "price", header: "السعر", render: (r) => r.price ? <Money value={r.price} className="font-bold" /> : "—" },
    { key: "renewal", header: "التجديد", render: (r) => (
      <div className="flex flex-col gap-1">
        <span className="text-[11px]">{formatDate(r.renewalDate)}</span>
        {r.renewalDate && r.status !== "CANCELLED" && <DueBadge date={r.renewalDate} />}
      </div>
    ), hideOnMobile: true },
  ];

  const reqCols: Column<any>[] = [
    { key: "code", header: "المرجع", render: (r) => (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] font-bold text-electric">{r.code}</span>
        {r.legacy && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">قديم</span>}
      </div>
    ) },
    { key: "title", header: "الخدمة", render: (r) => (
      <div className="min-w-0">
        <div className="font-semibold truncate">{r.title}</div>
        <div className="text-[10px] text-muted-foreground">{KIND_LABEL[r.kind] ?? r.kind}</div>
      </div>
    ) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "price", header: "السعر", render: (r) => (r.quotedPrice || r.basePrice ? <Money value={r.quotedPrice ?? r.basePrice} className="font-bold" /> : <span className="text-muted-foreground text-[11px]">—</span>) },
    { key: "createdAt", header: "التاريخ", hideOnMobile: true, render: (r) => <span className="text-[11px]">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-6">
      <ClientPageHeader
        icon={Boxes}
        title="خدماتي"
        description="كتالوج الخدمات، اشتراكاتك الحالية، وسجل طلباتك — في مكان واحد."
        actions={
          <div className="flex items-center gap-2">
            <LiveBadge interval={20} />
            <Link to="/client/services/new" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-electric to-purple-accent px-3 py-2 text-[12px] font-bold text-white">
              <Plus className="h-3.5 w-3.5" /> طلب جديد
            </Link>
          </div>
        }
      />

      {/* Catalog showcase */}
      <ServiceCatalog />

      {/* Tabs: subscriptions vs. requests history */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-2xl border border-border bg-card p-1">
          <TabButton active={tab === "subscriptions"} onClick={() => setTab("subscriptions")} icon={Clock} label="اشتراكاتي الحالية" count={stats.total} />
          <TabButton active={tab === "requests"} onClick={() => setTab("requests")} icon={ClipboardList} label="سجل الخدمات المطلوبة" count={reqStats.total} />
        </div>
        {tab === "requests" && (
          <Link to="/client/services/requests" className="inline-flex items-center gap-1 text-[11px] font-bold text-electric hover:underline">
            الفلترة المتقدمة <ArrowLeft className="h-3 w-3" />
          </Link>
        )}
      </div>

      <AnimatePresence mode="wait">
        {tab === "subscriptions" ? (
          <motion.section
            key="subs"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <AdminStatsRow
              loading={list.isLoading}
              stats={[
                { icon: Layers, label: "إجمالي الخدمات", value: stats.total, accent: "electric" },
                { icon: Activity, label: "نشطة", value: stats.active, accent: "emerald" },
                { icon: PauseCircle, label: "متوقفة", value: stats.paused, accent: "amber" },
                { icon: RefreshCw, label: "تجديد خلال 30 يوم", value: stats.renewingSoon, accent: "cyan" },
                { icon: AlertTriangle, label: "تجديد متأخر", value: stats.overdueRenewal, accent: "rose" },
                { icon: Wallet, label: "إجمالي القيمة", value: <Money value={stats.monthly} />, accent: "purple" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في الخدمات…" className="h-9 pr-8 text-sm" />
              </div>
              {stats.topTypes.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <button onClick={() => setType(null)} className={`h-8 rounded-lg px-2.5 text-[11px] font-bold transition ${!type ? "bg-electric/15 text-electric" : "text-muted-foreground hover:text-foreground"}`}>الكل</button>
                  {stats.topTypes.map(([t, count]) => {
                    const Icon = TYPE_ICON[t] || Package;
                    const active = type === t;
                    return (
                      <button key={t} onClick={() => setType(active ? null : t)} className={`inline-flex items-center gap-1 h-8 rounded-lg px-2.5 text-[11px] font-bold transition ${active ? TYPE_TONE[t] : "text-muted-foreground hover:text-foreground"}`}>
                        <Icon className="h-3 w-3" />
                        {TYPE_AR[t] || t}
                        <span className="text-[9px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <FilterChips
              value={status} onChange={setStatus}
              chips={[
                { key: "", label: "الكل", count: stats.total },
                { key: "ACTIVE", label: "نشطة", count: stats.active },
                { key: "PAUSED", label: "متوقفة", count: stats.paused },
                { key: "CANCELLED", label: "ملغاة" },
              ]}
            />

            <DataTable
              columns={columns} rows={filtered} loading={list.isLoading}
              total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
              onRowClick={(r: any) => nav({ to: "/client/services/$id", params: { id: r.id } })}
              emptyTitle="لا توجد خدمات مطابقة — تصفح الكتالوج أعلاه لطلب خدمة جديدة"
            />
          </motion.section>
        ) : (
          <motion.section
            key="reqs"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <AdminStatsRow
              loading={reqList.isLoading}
              stats={[
                { icon: Inbox, label: "إجمالي الطلبات", value: reqStats.total, accent: "electric" },
                { icon: Clock, label: "قيد المعالجة", value: reqStats.pending, accent: "amber" },
                { icon: ClipboardList, label: "مُسعَّرة", value: reqStats.quoted, accent: "cyan" },
                { icon: Wallet, label: "بانتظار الدفع", value: reqStats.awaitingPayment, accent: "purple" },
                { icon: Activity, label: "مُفعَّلة", value: reqStats.active, accent: "emerald" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={reqQ} onChange={(e) => setReqQ(e.target.value)} placeholder="ابحث بالمرجع أو العنوان…" className="h-9 pr-8 text-sm" />
              </div>
            </div>

            <FilterChips
              value={reqStatus} onChange={setReqStatus}
              chips={[
                { key: "", label: "الكل", count: reqStats.total },
                { key: "SUBMITTED", label: "مُقدَّم", count: reqStats.counts.SUBMITTED },
                { key: "UNDER_REVIEW", label: "قيد المراجعة", count: reqStats.counts.UNDER_REVIEW },
                { key: "QUOTED", label: "مُسعَّر", count: reqStats.counts.QUOTED },
                { key: "AWAITING_PAYMENT", label: "بانتظار الدفع", count: reqStats.counts.AWAITING_PAYMENT },
                { key: "PAID", label: "مدفوع", count: reqStats.counts.PAID },
                { key: "ACTIVE", label: "مُفعَّل", count: reqStats.counts.ACTIVE },
                { key: "REJECTED", label: "مرفوض", count: reqStats.counts.REJECTED },
              ]}
            />

            <DataTable
              columns={reqCols} rows={filteredReqs} loading={reqList.isLoading}
              total={filteredReqs.length} page={1} pageSize={50} onPageChange={() => {}}
              onRowClick={(r: any) => r.legacy
                ? nav({ to: "/client/projects/requests/$id", params: { id: r.legacyProjectRequestId ?? r.id } })
                : nav({ to: "/client/services/requests/$id", params: { id: r.id } })}
              emptyTitle="لا توجد طلبات خدمات بعد — ابدأ بطلب جديد من الكتالوج أعلاه"
            />
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: any; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-bold transition ${
        active
          ? "bg-gradient-to-r from-electric/20 to-purple-accent/20 text-foreground ring-1 ring-electric/40 shadow-inner"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {typeof count === "number" && (
        <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] ${active ? "bg-electric text-white" : "bg-muted/60 text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
