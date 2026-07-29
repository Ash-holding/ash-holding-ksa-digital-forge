import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Inbox, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { LiveBadge } from "@/components/client/LiveBadge";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { FilterChips } from "@/components/admin/FilterChips";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/client/services/requests/")({
  component: ClientServiceRequestsList,
  head: () => ({
    meta: [
      { title: "طلبات الخدمات — بوابة العميل" },
      { name: "description", content: "سجل طلبات الخدمات: اشتراكات، تسعيرات، وتجديدات — بمتابعة لحظية للحالة." },
      { property: "og:title", content: "طلبات الخدمات — ASH HOLDING" },
      { property: "og:description", content: "تابع جميع طلبات الخدمات في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const KIND_LABEL: Record<string, string> = {
  NEW_SUBSCRIPTION: "اشتراك جديد",
  QUOTE_REQUEST: "طلب تسعير",
  RENEWAL_UPGRADE: "تجديد/ترقية",
};

function ClientServiceRequestsList() {
  const nav = useNavigate();
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["client-service-requests"],
    queryFn: async () => (await api.get("/service-requests")).data,
    refetchInterval: 15000,
  });
  const rows = (list.data?.rows ?? []) as any[];

  const filtered = useMemo(() => {
    let out = rows;
    if (status) out = out.filter((r) => r.status === status);
    if (q.trim()) out = out.filter((r) => (r.title + r.code).toLowerCase().includes(q.toLowerCase()));
    return out;
  }, [rows, status, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const cols: Column<any>[] = [
    { key: "code", header: "المرجع", render: (r) => <span className="font-mono text-[11px] font-bold text-electric">{r.code}</span> },
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
    <div className="space-y-5">
      <ClientPageHeader
        icon={Inbox}
        title="طلبات الخدمات"
        description="سجل مستقل لطلبات الخدمات — منفصل تماماً عن طلبات المشاريع."
        actions={
          <div className="flex items-center gap-2">
            <LiveBadge interval={15} />
            <Link to="/client/services/new" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-electric to-purple-accent px-3 py-2 text-[12px] font-bold text-white">
              <Plus className="h-3.5 w-3.5" /> طلب جديد
            </Link>
          </div>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالعنوان أو المرجع..." className="h-9 pr-8 text-sm" />
        </div>
      </div>

      <FilterChips
        value={status}
        onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: counts.total },
          { key: "SUBMITTED", label: "مُقدَّم", count: counts.SUBMITTED },
          { key: "UNDER_REVIEW", label: "قيد المراجعة", count: counts.UNDER_REVIEW },
          { key: "QUOTED", label: "مُسعَّر", count: counts.QUOTED },
          { key: "AWAITING_PAYMENT", label: "بانتظار الدفع", count: counts.AWAITING_PAYMENT },
          { key: "PAID", label: "مدفوع", count: counts.PAID },
          { key: "ACTIVE", label: "مُفعَّل", count: counts.ACTIVE },
          { key: "REJECTED", label: "مرفوض", count: counts.REJECTED },
        ]}
      />

      <DataTable
        columns={cols}
        rows={filtered}
        loading={list.isLoading}
        total={filtered.length}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        onRowClick={(r) => nav({ to: "/client/services/requests/$id", params: { id: r.id } })}
        emptyTitle="لا توجد طلبات خدمات بعد — ابدأ بطلب جديد من الكتالوج"
      />
    </div>
  );
}
