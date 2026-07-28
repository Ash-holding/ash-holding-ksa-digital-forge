import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileText, Receipt, Wallet, Clock, AlertTriangle, CheckCircle2, Search,
  Download, CreditCard, TrendingDown, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { LiveBadge, DueBadge } from "@/components/client/LiveBadge";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { downloadInvoicePDF } from "@/lib/invoice-print";


export const Route = createFileRoute("/_authenticated/client/invoices")({
  component: ClientInvoicesPage,
});

type SortKey = "recent" | "due" | "amount";

function ClientInvoicesPage() {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const list = useQuery({
    queryKey: ["client-invoices", page],
    queryFn: async () => (await api.get("/invoices", { params: { page } })).data,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = useMemo(() => {
    const total = rows.length;
    const paid = rows.filter((r) => r.status === "PAID").length;
    const unpaid = rows.filter((r) => r.status !== "PAID" && r.status !== "CANCELLED").length;
    const now = Date.now();
    const overdue = rows.filter((r) => r.status !== "PAID" && r.status !== "CANCELLED" && r.dueAt && new Date(r.dueAt).getTime() < now).length;
    const dueSoon = rows.filter((r) => r.status !== "PAID" && r.status !== "CANCELLED" && r.dueAt && new Date(r.dueAt).getTime() >= now && new Date(r.dueAt).getTime() - now < 7 * 86400000).length;
    const totalPaid = rows.filter((r) => r.status === "PAID").reduce((s, r) => s + Number(r.total ?? 0), 0);
    const totalDue = rows.filter((r) => r.status !== "PAID" && r.status !== "CANCELLED").reduce((s, r) => s + Number(r.total ?? 0), 0);
    const totalOverdue = rows.filter((r) => r.status !== "PAID" && r.status !== "CANCELLED" && r.dueAt && new Date(r.dueAt).getTime() < now).reduce((s, r) => s + Number(r.total ?? 0), 0);
    const paidRate = total ? Math.round((paid / total) * 100) : 0;
    return { total, paid, unpaid, overdue, dueSoon, totalPaid, totalDue, totalOverdue, paidRate };
  }, [rows]);

  const filtered = useMemo(() => {
    let out = status ? rows.filter((r) => r.status === status) : rows;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      out = out.filter((r) => (r.invoiceNumber || "").toLowerCase().includes(s));
    }
    const sorted = [...out];
    if (sort === "due") sorted.sort((a, b) => new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime());
    else if (sort === "amount") sorted.sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));
    else sorted.sort((a, b) => new Date(b.issueDate || b.createdAt || 0).getTime() - new Date(a.issueDate || a.createdAt || 0).getTime());
    return sorted;
  }, [rows, status, q, sort]);

  const columns: Column<any>[] = [
    { key: "num", header: "الرقم", render: (r) => (
      <div className="min-w-0">
        <span dir="ltr" className="font-mono text-sm font-bold">{r.invoiceNumber}</span>
        <div className="text-[10px] text-muted-foreground">{formatDate(r.issueDate || r.createdAt)}</div>
      </div>
    ) },
    { key: "status", header: "الحالة", render: (r) => (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge value={r.status} />
        {r.status !== "PAID" && r.status !== "CANCELLED" && r.dueAt && <DueBadge date={r.dueAt} />}
      </div>
    ) },
    { key: "total", header: "الإجمالي", render: (r) => <Money value={r.total} className="font-bold" /> },
    { key: "due", header: "الاستحقاق", render: (r) => formatDate(r.dueAt), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <div className="flex items-center gap-1 justify-end">
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={async (e) => { e.stopPropagation(); const t = toast.loading("جاري تجهيز الفاتورة…"); try { await downloadInvoicePDF(r); toast.success("تم تحميل الفاتورة", { id: t }); } catch { toast.error("تعذّر إنشاء الملف", { id: t }); } }} title="تنزيل PDF">
          <Download className="h-3.5 w-3.5" />
        </Button>

        <Button size="sm" variant={r.status === "PAID" ? "ghost" : "default"} className="h-8 gap-1"
          onClick={(e) => { e.stopPropagation(); if (r.status !== "PAID") toast.info("قريباً — بوابة الدفع"); }}
          disabled={r.status === "PAID" || r.status === "CANCELLED"}>
          <CreditCard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-[11px]">{r.status === "PAID" ? "مدفوعة" : "ادفع"}</span>
        </Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={FileText}
        title="فواتيري"
        description="متابعة جميع فواتيرك بالحالة ومواعيد الاستحقاق."
        actions={<LiveBadge interval={15} />}
      />
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Receipt, label: "إجمالي الفواتير", value: stats.total, accent: "electric", hint: `نسبة السداد ${stats.paidRate}%` },
          { icon: CheckCircle2, label: "مدفوعة", value: stats.paid, accent: "emerald" },
          { icon: Clock, label: "تستحق قريباً", value: stats.dueSoon, accent: "amber" },
          { icon: AlertTriangle, label: "متأخرة", value: stats.overdue, accent: "rose", hint: stats.totalOverdue > 0 ? `${stats.totalOverdue.toLocaleString("ar-SA")} ر.س متأخرة` : undefined },
          { icon: TrendingUp, label: "إجمالي المدفوع", value: <Money value={stats.totalPaid} />, accent: "emerald" },
          { icon: Wallet, label: "المستحق عليك", value: <Money value={stats.totalDue} />, accent: "purple" },
        ]}
      />

      {/* Toolbar: search + sort */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الفاتورة…" className="h-9 pr-8 text-sm" dir="ltr" />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">
          <SortBtn active={sort === "recent"} onClick={() => setSort("recent")}>الأحدث</SortBtn>
          <SortBtn active={sort === "due"} onClick={() => setSort("due")}>الاستحقاق</SortBtn>
          <SortBtn active={sort === "amount"} onClick={() => setSort("amount")}>القيمة</SortBtn>
        </div>
      </div>

      <FilterChips
        value={status} onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: stats.total },
          { key: "SENT", label: "مرسلة" },
          { key: "PAID", label: "مدفوعة", count: stats.paid },
          { key: "OVERDUE", label: "متأخرة", count: stats.overdue },
          { key: "CANCELLED", label: "ملغاة" },
        ]}
      />

      <DataTable
        columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        onRowClick={(r: any) => nav({ to: "/client/invoices/$id", params: { id: r.id } })}
        emptyTitle="لا توجد فواتير"
      />
    </div>
  );
}

function SortBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "h-8 rounded-md px-2.5 text-[11px] font-semibold transition",
      active ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground",
    )}>{children}</button>
  );
}
