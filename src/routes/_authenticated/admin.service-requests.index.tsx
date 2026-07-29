import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Inbox, Search, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/service-requests/")({
  component: AdminServiceRequestsIndex,
});

const STAGES = [
  { key: "SUBMITTED", label: "جديد", tone: "from-sky-500 to-cyan-600" },
  { key: "UNDER_REVIEW", label: "قيد المراجعة", tone: "from-amber-500 to-orange-600" },
  { key: "QUOTED", label: "مُسعَّر", tone: "from-violet-500 to-purple-600" },
  { key: "AWAITING_PAYMENT", label: "بانتظار الدفع", tone: "from-yellow-500 to-amber-600" },
  { key: "PAID", label: "مدفوع", tone: "from-emerald-500 to-teal-600" },
  { key: "ACTIVE", label: "مُفعَّل", tone: "from-emerald-500 to-cyan-600" },
];

function AdminServiceRequestsIndex() {
  const nav = useNavigate();
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["admin-service-requests"],
    queryFn: async () => (await api.get("/service-requests")).data,
    refetchInterval: 15000,
  });
  const rows = (list.data?.rows ?? []) as any[];

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (status) out = out.filter((r) => r.status === status);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((r) =>
        (r.title + r.code + (r.client?.user?.name ?? "") + (r.client?.user?.email ?? "")).toLowerCase().includes(s)
      );
    }
    return out;
  }, [rows, status, q]);

  const cols: Column<any>[] = [
    { key: "code", header: "المرجع", render: (r) => <span className="font-mono text-[11px] font-bold text-electric">{r.code}</span> },
    { key: "client", header: "العميل", render: (r) => (
      <div className="min-w-0">
        <div className="font-semibold truncate">{r.client?.user?.name ?? "—"}</div>
        <div className="text-[10px] text-muted-foreground truncate">{r.client?.user?.email}</div>
      </div>
    ) },
    { key: "title", header: "الخدمة", render: (r) => (
      <div className="min-w-0">
        <div className="font-semibold truncate">{r.title}</div>
        <div className="text-[10px] text-muted-foreground">{kindLabel(r.kind)}</div>
      </div>
    ) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "price", header: "السعر", render: (r) => (r.quotedPrice || r.basePrice ? <Money value={r.quotedPrice ?? r.basePrice} className="font-bold" /> : "—") },
    { key: "createdAt", header: "تاريخ", hideOnMobile: true, render: (r) => <span className="text-[11px]">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Inbox}
        title="طلبات الخدمات"
        description="سجل مستقل عن طلبات المشاريع — إدارة كاملة للتسعير والتفعيل."
      />

      {/* Kanban-lite summary */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((s) => (
          <button key={s.key} onClick={() => setStatus(status === s.key ? null : s.key)} className={`group relative overflow-hidden rounded-2xl border p-3 text-right transition ${status === s.key ? "border-transparent ring-2 ring-electric" : "border-border hover:border-electric/50"} bg-card`}>
            <div aria-hidden className={`absolute -top-8 -left-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl ${s.tone}`} />
            <div className="relative">
              <div className="text-[10px] font-bold text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-black tabular-nums">{counts[s.key] ?? 0}</div>
            </div>
          </button>
        ))}
      </motion.div>

      <div className="rounded-2xl border border-border bg-card p-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالعميل، المرجع، أو العنوان..." className="h-9 pr-8 text-sm" />
        </div>
        {status && (
          <button onClick={() => setStatus(null)} className="text-[11px] text-electric font-bold px-2">مسح الفلتر</button>
        )}
      </div>

      <FilterChips
        value={status}
        onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: counts.total },
          ...STAGES.map((s) => ({ key: s.key, label: s.label, count: counts[s.key] })),
          { key: "REJECTED", label: "مرفوض", count: counts.REJECTED },
          { key: "CANCELLED", label: "ملغى", count: counts.CANCELLED },
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
        onRowClick={(r) => nav({ to: "/admin/service-requests/$id", params: { id: r.id } })}
        emptyTitle="لا توجد طلبات خدمات مطابقة"
      />
    </div>
  );
}

function kindLabel(k: string) {
  return ({ NEW_SUBSCRIPTION:"اشتراك جديد", QUOTE_REQUEST:"طلب تسعير", RENEWAL_UPGRADE:"تجديد/ترقية" } as any)[k] ?? k;
}
