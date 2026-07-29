import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Inbox, Plus, Search, X, SlidersHorizontal, CalendarRange, Package } from "lucide-react";
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

const CATALOG_LABEL: Record<string, string> = {
  dev: "البرمجة والتطوير",
  systems: "الأنظمة والبنية التحتية",
  marketing: "التسويق الرقمي",
  design: "التصميم والهوية",
};

const DATE_RANGES: { key: string; label: string; days: number | null }[] = [
  { key: "all", label: "كل الفترات", days: null },
  { key: "7", label: "آخر 7 أيام", days: 7 },
  { key: "30", label: "آخر 30 يوم", days: 30 },
  { key: "90", label: "آخر 90 يوم", days: 90 },
  { key: "custom", label: "مخصص", days: null },
];

function ClientServiceRequestsList() {
  const nav = useNavigate();
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("");
  const [catalog, setCatalog] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [sort, setSort] = useState<string>("newest");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const list = useQuery({
    queryKey: ["client-service-requests"],
    queryFn: async () => (await api.get("/service-requests")).data,
    refetchInterval: 15000,
  });
  const rows = (list.data?.rows ?? []) as any[];

  const dateBoundary = useMemo(() => {
    if (dateRange === "custom") {
      return {
        from: fromDate ? new Date(fromDate).getTime() : null,
        to: toDate ? new Date(toDate).getTime() + 86400000 : null,
      };
    }
    const preset = DATE_RANGES.find((d) => d.key === dateRange);
    if (!preset || preset.days == null) return { from: null, to: null };
    return { from: Date.now() - preset.days * 86400000, to: null };
  }, [dateRange, fromDate, toDate]);

  const filtered = useMemo(() => {
    let out = rows;
    if (status) out = out.filter((r) => r.status === status);
    if (kind) out = out.filter((r) => r.kind === kind);
    if (catalog) out = out.filter((r) => (r.catalogKey ?? r.catalog) === catalog);
    if (dateBoundary.from != null) out = out.filter((r) => new Date(r.createdAt).getTime() >= dateBoundary.from!);
    if (dateBoundary.to != null) out = out.filter((r) => new Date(r.createdAt).getTime() <= dateBoundary.to!);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((r) => `${r.title ?? ""} ${r.code ?? ""} ${r.notes ?? ""}`.toLowerCase().includes(s));
    }
    const sorted = [...out];
    sorted.sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "price_desc") return Number(b.quotedPrice ?? b.basePrice ?? 0) - Number(a.quotedPrice ?? a.basePrice ?? 0);
      if (sort === "price_asc") return Number(a.quotedPrice ?? a.basePrice ?? 0) - Number(b.quotedPrice ?? b.basePrice ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return sorted;
  }, [rows, status, kind, catalog, dateBoundary, q, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const activeFiltersCount =
    (kind ? 1 : 0) + (catalog ? 1 : 0) + (dateRange !== "all" ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  const resetAll = () => {
    setStatus(null); setQ(""); setKind(""); setCatalog("");
    setDateRange("all"); setFromDate(""); setToDate(""); setSort("newest");
  };

  const cols: Column<any>[] = [
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

      {/* Search + advanced toggle */}
      <div className="rounded-2xl border border-border bg-card p-2 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالعنوان أو المرجع أو الملاحظات..."
            className="h-9 pr-8 text-sm"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="مسح البحث"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`inline-flex items-center gap-1.5 h-9 rounded-lg px-3 text-[12px] font-bold transition ${
            showAdvanced || activeFiltersCount > 0
              ? "bg-electric/15 text-electric ring-1 ring-electric/30"
              : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          فلترة متقدمة
          {activeFiltersCount > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-electric px-1 text-[9px] text-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
        {(activeFiltersCount > 0 || status || q) && (
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-1 h-9 rounded-lg bg-rose-500/10 px-3 text-[12px] font-bold text-rose-400 hover:bg-rose-500/20"
          >
            <X className="h-3.5 w-3.5" /> مسح الكل
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Kind */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground">نوع الطلب</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">الكل</option>
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Catalog */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground">قسم الخدمة</label>
              <select
                value={catalog}
                onChange={(e) => setCatalog(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">جميع الأقسام</option>
                {Object.entries(CATALOG_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground">تاريخ الطلب</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                {DATE_RANGES.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground">الترتيب</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
                <option value="price_desc">السعر: من الأعلى</option>
                <option value="price_asc">السعر: من الأقل</option>
              </select>
            </div>
          </div>

          {/* Custom date range */}
          {dateRange === "custom" && (
            <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-background/50 p-3 border border-border/60">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <CalendarRange className="h-3 w-3" /> من تاريخ
                </label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <CalendarRange className="h-3 w-3" /> إلى تاريخ
                </label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Results summary */}
      <div className="text-[11px] text-muted-foreground px-1">
        عرض <span className="font-bold text-foreground">{filtered.length}</span> من أصل{" "}
        <span className="font-bold text-foreground">{rows.length}</span> طلب
      </div>

      <DataTable
        columns={cols}
        rows={filtered}
        loading={list.isLoading}
        total={filtered.length}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        onRowClick={(r) => r.legacy
          ? nav({ to: "/client/projects/requests/$id", params: { id: r.legacyProjectRequestId ?? r.id } })
          : nav({ to: "/client/services/requests/$id", params: { id: r.id } })}
        emptyTitle="لا توجد طلبات مطابقة للفلترة — جرّب توسيع نطاق البحث أو مسح الفلاتر"
      />
    </div>
  );
}
