import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Boxes, Activity, PauseCircle, RefreshCw, Wallet, Layers } from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

const TYPE_AR: Record<string, string> = { WEBSITE:"موقع", MOBILE_APP:"تطبيق", ADMIN_SYSTEM:"نظام", HOSTING:"استضافة", VPS:"VPS", DEDICATED_SERVER:"سيرفر", SMTP:"SMTP", MARKETING:"تسويق", DESIGN:"تصميم", SUPPORT:"دعم", OTHER:"أخرى" };

export const Route = createFileRoute("/_authenticated/client/services")({
  component: ClientServicesPage,
});

function ClientServicesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["client-services", page],
    queryFn: async () => (await api.get("/services", { params: { page } })).data,
    refetchInterval: 20000,
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const paused = rows.filter((r) => r.status === "PAUSED").length;
    const soon = Date.now() + 30 * 86400000;
    const renewingSoon = rows.filter((r) => r.renewalDate && new Date(r.renewalDate).getTime() < soon).length;
    const monthly = rows.reduce((s, r) => s + Number(r.price ?? 0), 0);
    return { total, active, paused, renewingSoon, monthly };
  }, [rows]);

  const filtered = useMemo(() => (status ? rows.filter((r) => r.status === status) : rows), [rows, status]);

  const columns: Column<any>[] = [
    { key: "name", header: "الخدمة", render: (r) => <div className="font-semibold truncate">{r.name}</div> },
    { key: "type", header: "النوع", render: (r) => TYPE_AR[r.type] || r.type },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "price", header: "السعر", render: (r) => r.price ? <Money value={r.price} /> : "—" },
    { key: "renewal", header: "التجديد", render: (r) => formatDate(r.renewalDate), hideOnMobile: true },
  ];

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={Boxes}
        title="خدماتي"
        description="جميع الخدمات النشطة والاشتراكات مع تنبيهات التجديد."
      />
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Layers, label: "إجمالي الخدمات", value: stats.total, accent: "electric" },
          { icon: Activity, label: "نشطة", value: stats.active, accent: "emerald" },
          { icon: PauseCircle, label: "متوقفة", value: stats.paused, accent: "amber" },
          { icon: RefreshCw, label: "تجديد خلال 30 يوم", value: stats.renewingSoon, accent: "cyan" },
          { icon: Wallet, label: "إجمالي القيمة", value: <Money value={stats.monthly} />, accent: "purple" },
        ]}
      />
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
        emptyTitle="لا توجد خدمات نشطة"
      />
    </div>
  );
}
