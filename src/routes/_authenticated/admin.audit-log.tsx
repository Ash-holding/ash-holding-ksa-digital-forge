import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClipboardList, Activity, AlertCircle, LogIn, Download } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit-log")({
  component: AuditPage,
});

type Row = { id: string; action: string; entityType?: string | null; entityId?: string | null; ipAddress?: string | null; createdAt: string; user?: { name: string; email: string; role: string } | null };
type Stats = { total: number; today: number; critical: number; logins: number };

function toCsv(rows: Row[]): string {
  const header = ["الوقت", "المستخدم", "الدور", "الإجراء", "الكيان", "IP"];
  const lines = rows.map((r) => [
    r.createdAt, r.user?.name ?? "", r.user?.role ?? "", r.action,
    `${r.entityType ?? ""}${r.entityId ? " #" + r.entityId : ""}`, r.ipAddress ?? "",
  ].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
  return "\uFEFF" + [header.join(","), ...lines].join("\n");
}

function AuditPage() {
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["audit-log", page],
    queryFn: async () => (await api.get("/admin/audit-log", { params: { page, pageSize: 30 } })).data,
    refetchInterval: 15000, refetchOnWindowFocus: true,
  });
  const stats = list.data?.stats as Stats | undefined;
  const rows = (list.data?.rows ?? []) as Row[];
  const filtered = useMemo(() => {
    if (!kind) return rows;
    if (kind === "login") return rows.filter((r) => r.action.includes("LOGIN"));
    if (kind === "critical") return rows.filter((r) => r.action.includes("FAILED") || r.action.includes("DELETE"));
    return rows.filter((r) => r.entityType === kind);
  }, [rows, kind]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const columns: Column<Row>[] = [
    { key: "when", header: "الوقت", render: (r) => formatDate(r.createdAt, true) },
    { key: "user", header: "المستخدم", render: (r) => r.user ? (
      <div className="min-w-0"><div className="text-sm truncate">{r.user.name}</div><div className="text-[11px] text-muted-foreground truncate">{r.user.role}</div></div>
    ) : <span className="text-muted-foreground text-xs">مجهول</span> },
    { key: "action", header: "الإجراء", render: (r) => <StatusBadge value={r.action.includes("FAILED") ? "FAILED" : r.action.includes("DELETE") ? "OVERDUE" : "SUCCESS"} className="font-mono text-[10px]" /> },
    { key: "actionText", header: "التفاصيل", render: (r) => <span dir="ltr" className="font-mono text-xs">{r.action}</span>, hideOnMobile: true },
    { key: "entity", header: "الكيان", render: (r) => r.entityType ? `${r.entityType}${r.entityId ? ` #${r.entityId.slice(0, 8)}` : ""}` : "—", hideOnMobile: true },
    { key: "ip", header: "IP", render: (r) => <span dir="ltr" className="font-mono text-xs">{r.ipAddress || "—"}</span>, hideOnMobile: true },
  ];

  return (
    <>
      <PageHeader icon={ClipboardList} title="سجل التدقيق" description="جميع إجراءات المستخدمين على النظام — لحظي."
        actions={<Button variant="outline" onClick={exportCsv} className="gap-2"><Download className="h-4 w-4" />تصدير CSV</Button>} />

      <AdminStatsRow loading={list.isLoading} stats={[
        { icon: ClipboardList, label: "إجمالي الأحداث", value: stats?.total ?? 0, accent: "electric" },
        { icon: Activity, label: "اليوم", value: stats?.today ?? 0, accent: "cyan" },
        { icon: LogIn, label: "عمليات دخول", value: stats?.logins ?? 0, accent: "emerald" },
        { icon: AlertCircle, label: "حرجة", value: stats?.critical ?? 0, accent: "rose" },
      ]} />

      <FilterChips value={kind} onChange={setKind} chips={[
        { key: "", label: "الكل", count: stats?.total },
        { key: "login", label: "دخول/خروج", count: stats?.logins },
        { key: "critical", label: "حرجة", count: stats?.critical },
        { key: "User", label: "مستخدمون" },
        { key: "Client", label: "عملاء" },
        { key: "Invoice", label: "فواتير" },
        { key: "Contract", label: "عقود" },
      ]} />

      <DataTable<Row> columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={30} onPageChange={setPage}
        emptyTitle="لا يوجد سجل" />
    </>
  );
}
