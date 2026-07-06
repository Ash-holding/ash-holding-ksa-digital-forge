import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit-log")({
  component: AuditPage,
});

type Row = { id: string; action: string; entityType?: string | null; entityId?: string | null; ipAddress?: string | null;
  createdAt: string; user?: { name: string; email: string; role: string } | null };

function AuditPage() {
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ["audit-log", page], queryFn: async () => (await api.get("/admin/audit-log", { params: { page, pageSize: 30 } })).data });

  const columns: Column<Row>[] = [
    { key: "when", header: "الوقت", render: (r) => formatDate(r.createdAt, true) },
    { key: "user", header: "المستخدم", render: (r) => r.user ? <div><div className="text-sm">{r.user.name}</div><div className="text-[11px] text-muted-foreground">{r.user.role}</div></div> : "—" },
    { key: "action", header: "الإجراء", render: (r) => <span dir="ltr" className="font-mono text-xs">{r.action}</span> },
    { key: "entity", header: "الكيان", render: (r) => r.entityType ? `${r.entityType}${r.entityId ? ` #${r.entityId.slice(0, 8)}` : ""}` : "—", hideOnMobile: true },
    { key: "ip", header: "IP", render: (r) => <span dir="ltr" className="text-xs">{r.ipAddress || "—"}</span>, hideOnMobile: true },
  ];

  return (
    <>
      <PageHeader icon={ClipboardList} title="سجل التدقيق" description="جميع إجراءات المستخدمين على النظام." />
      <DataTable<Row> columns={columns} rows={list.data?.rows} loading={list.isLoading}
        total={list.data?.total} page={page} pageSize={30} onPageChange={setPage} />
    </>
  );
}
