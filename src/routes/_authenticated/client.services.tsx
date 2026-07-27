import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Boxes, Activity, PauseCircle, RefreshCw, Wallet, Layers, Search, AlertTriangle,
  Globe, Smartphone, Server, Mail, Megaphone, Palette, LifeBuoy, HardDrive, Package,
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

const TYPE_AR: Record<string, string> = { WEBSITE:"موقع", MOBILE_APP:"تطبيق", ADMIN_SYSTEM:"نظام", HOSTING:"استضافة", VPS:"VPS", DEDICATED_SERVER:"سيرفر", SMTP:"SMTP", MARKETING:"تسويق", DESIGN:"تصميم", SUPPORT:"دعم", OTHER:"أخرى" };
const TYPE_ICON: Record<string, any> = { WEBSITE: Globe, MOBILE_APP: Smartphone, ADMIN_SYSTEM: Server, HOSTING: HardDrive, VPS: Server, DEDICATED_SERVER: Server, SMTP: Mail, MARKETING: Megaphone, DESIGN: Palette, SUPPORT: LifeBuoy, OTHER: Package };
const TYPE_TONE: Record<string, string> = { WEBSITE: "text-electric bg-electric/10", MOBILE_APP: "text-purple-accent bg-purple-accent/10", ADMIN_SYSTEM: "text-cyan-400 bg-cyan-500/10", HOSTING: "text-emerald-400 bg-emerald-500/10", VPS: "text-emerald-400 bg-emerald-500/10", DEDICATED_SERVER: "text-emerald-400 bg-emerald-500/10", SMTP: "text-amber-400 bg-amber-500/10", MARKETING: "text-rose-400 bg-rose-500/10", DESIGN: "text-purple-accent bg-purple-accent/10", SUPPORT: "text-cyan-400 bg-cyan-500/10", OTHER: "text-muted-foreground bg-muted/40" };

export const Route = createFileRoute("/_authenticated/client/services")({
  component: ClientServicesPage,
});

function ClientServicesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["client-services", page],
    queryFn: async () => (await api.get("/services", { params: { page } })).data,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const paused = rows.filter((r) => r.status === "PAUSED").length;
    const now = Date.now();
    const soon = now + 30 * 86400000;
    const renewingSoon = rows.filter((r) => r.renewalDate && new Date(r.renewalDate).getTime() < soon && new Date(r.renewalDate).getTime() >= now).length;
    const overdueRenewal = rows.filter((r) => r.renewalDate && new Date(r.renewalDate).getTime() < now && r.status !== "CANCELLED").length;
    const monthly = rows.reduce((s, r) => s + Number(r.price ?? 0), 0);
    // Type breakdown for top types
    const byType = new Map<string, number>();
    rows.forEach((r) => byType.set(r.type, (byType.get(r.type) ?? 0) + 1));
    const topTypes = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { total, active, paused, renewingSoon, overdueRenewal, monthly, topTypes };
  }, [rows]);

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

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={Boxes}
        title="خدماتي"
        description="جميع الخدمات النشطة والاشتراكات مع تنبيهات التجديد."
        actions={<LiveBadge interval={20} />}
      />
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

      {/* Search + type-tone quick filters */}
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
        emptyTitle="لا توجد خدمات مطابقة"
      />
    </div>
  );
}
