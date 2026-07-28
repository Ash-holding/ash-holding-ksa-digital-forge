import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileText, Receipt, Wallet, Clock, AlertTriangle, CheckCircle2, Search,
  Download, CreditCard, TrendingUp, Briefcase, Handshake, Sparkles,
  ArrowLeft, Hash, Calendar, ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { LiveBadge, DueBadge } from "@/components/client/LiveBadge";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { downloadInvoicePDF } from "@/lib/invoice-print";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Wallet as WalletIcon2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/client/invoices")({
  component: ClientInvoicesPage,
});

type SortKey = "recent" | "due" | "amount";

function ClientInvoicesPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const list = useQuery({
    queryKey: ["client-invoices"],
    queryFn: async () => (await api.get("/invoices", { params: { pageSize: 100 } })).data,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const walletQ = useQuery({
    queryKey: ["wallet-me"],
    queryFn: async () => (await api.get("/wallet/me")).data,
    refetchInterval: 15000,
  });
  const walletBal = Number(walletQ.data?.wallet?.balance ?? 0);

  const payWallet = useMutation({
    mutationFn: async (invoiceId: string) => (await api.post(`/invoices/${invoiceId}/pay-wallet`)).data,
    onSuccess: (data, invoiceId) => {
      toast.success("تم السداد من المحفظة بنجاح");
      if (data?.wallet) qc.setQueryData(["wallet-me"], (old: any) => (old ? { ...old, wallet: data.wallet } : old));
      qc.invalidateQueries({ queryKey: ["client-invoices"] });
      qc.invalidateQueries({ queryKey: ["wallet-me"] });
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "تعذّر السداد من المحفظة"),
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
      out = out.filter((r) =>
        (r.invoiceNumber || "").toLowerCase().includes(s) ||
        (r.project?.title || "").toLowerCase().includes(s) ||
        (r.linkedRequest?.title || "").toLowerCase().includes(s) ||
        (r.contract?.contractNumber || "").toLowerCase().includes(s),
      );
    }
    const sorted = [...out];
    if (sort === "due") sorted.sort((a, b) => new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime());
    else if (sort === "amount") sorted.sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));
    else sorted.sort((a, b) => new Date(b.issueDate || b.createdAt || 0).getTime() - new Date(a.issueDate || a.createdAt || 0).getTime());
    return sorted;
  }, [rows, status, q, sort]);

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={FileText}
        title="فواتيري"
        description="متابعة جميع فواتيرك بالحالة ومواعيد الاستحقاق — مربوطة بالمشاريع والعقود والخدمات."
        actions={<LiveBadge interval={15} />}
      />

      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Receipt,        label: "إجمالي الفواتير", value: stats.total,  accent: "electric", hint: `نسبة السداد ${stats.paidRate}%` },
          { icon: CheckCircle2,   label: "مدفوعة",           value: stats.paid,    accent: "emerald" },
          { icon: Clock,          label: "تستحق قريباً",     value: stats.dueSoon, accent: "amber" },
          { icon: AlertTriangle,  label: "متأخرة",           value: stats.overdue, accent: "rose",     hint: stats.totalOverdue > 0 ? `${stats.totalOverdue.toLocaleString("ar-SA")} ر.س` : undefined },
          { icon: TrendingUp,     label: "إجمالي المدفوع",   value: <Money value={stats.totalPaid} />, accent: "emerald" },
          { icon: Wallet,         label: "المستحق عليك",     value: <Money value={stats.totalDue} />,  accent: "purple" },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الفاتورة، المشروع، العقد…" className="h-9 pr-8 text-sm" />
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
          { key: "UNPAID", label: "غير مدفوعة", count: stats.unpaid - stats.overdue },
          { key: "PAID", label: "مدفوعة", count: stats.paid },
          { key: "OVERDUE", label: "متأخرة", count: stats.overdue },
          { key: "CANCELLED", label: "ملغاة" },
        ]}
      />

      {/* Card grid */}
      {list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r, i) => (
            <InvoiceCard
              key={r.id}
              inv={r}
              index={i}
              onOpen={() => nav({ to: "/client/invoices/$id", params: { id: r.id } })}
              walletBal={walletBal}
              onPayWallet={() => payWallet.mutateAsync(r.id)}
              paying={payWallet.isPending && payWallet.variables === r.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                 */
/* ------------------------------------------------------------------ */

function InvoiceCard({ inv, index, onOpen, walletBal, onPayWallet, paying }: { inv: any; index: number; onOpen: () => void; walletBal: number; onPayWallet: () => Promise<any>; paying: boolean }) {
  const isPaid = inv.status === "PAID";
  const isCancelled = inv.status === "CANCELLED";
  const overdue = !isPaid && !isCancelled && inv.dueAt && new Date(inv.dueAt).getTime() < Date.now();
  const accent = isPaid ? "emerald" : overdue ? "rose" : "electric";
  const accentGrad = {
    emerald: "from-emerald-500/80 to-emerald-400/40",
    rose:    "from-rose-500/80 to-rose-400/40",
    electric:"from-[#1D4ED8]/80 to-[#3B82F6]/40",
  }[accent];

  const project = inv.project ?? (inv.linkedRequest ? { title: inv.linkedRequest.title } : null);
  const contract = inv.contract;
  const service = inv.service;
  const req = inv.linkedRequest;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card transition-all",
        "hover:border-primary/40 hover:shadow-[0_10px_30px_-14px_rgba(29,78,216,.35)]",
      )}
    >
      {/* Accent bar */}
      <div className={cn("h-1 bg-gradient-to-l", accentGrad)} />

      {/* Header */}
      <button onClick={onOpen} className="w-full text-right p-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.14em] text-muted-foreground mb-1">
            <Hash className="h-3 w-3" /> رقم الفاتورة
          </div>
          <div dir="ltr" className="text-lg font-black text-foreground tracking-tight tabular-nums group-hover:text-primary transition-colors">
            {inv.invoiceNumber}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            صادرة {formatDate(inv.issueDate || inv.createdAt)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge value={inv.status} />
          {!isPaid && !isCancelled && inv.dueAt && <DueBadge date={inv.dueAt} />}
        </div>
      </button>

      {/* Amount */}
      <button onClick={onOpen} className="w-full text-right px-4 pb-3">
        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 flex items-baseline justify-between">
          <span className="text-[10.5px] font-bold tracking-[0.14em] text-muted-foreground">الإجمالي</span>
          <span dir="ltr" className="text-xl font-black tabular-nums text-foreground">
            {Number(inv.total ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
            <span className="text-[10px] ms-1 text-muted-foreground font-semibold">{inv.currency}</span>
          </span>
        </div>
      </button>

      {/* Cross-links */}
      {(project || contract || service || req) && (
        <div className="px-4 pb-3 space-y-1.5">
          {project && (
            <LinkChip
              icon={Briefcase}
              label="المشروع"
              value={project.title}
              to={inv.project?.id ? "/client/projects/$id" : req ? "/client/projects/requests/$id" : undefined}
              params={inv.project?.id ? { id: inv.project.id } : req ? { id: req.id } : undefined}
            />
          )}
          {contract && (
            <LinkChip
              icon={Handshake}
              label="العقد"
              value={contract.contractNumber}
              mono
              to="/client/contracts/$id"
              params={{ id: contract.id }}
            />
          )}
          {service && (
            <LinkChip
              icon={Sparkles}
              label="الخدمة"
              value={service.name}
              to="/client/services/$id"
              params={{ id: service.id }}
            />
          )}
          {req && !project && (
            <LinkChip
              icon={Briefcase}
              label="الطلب"
              value={req.title}
              to="/client/projects/requests/$id"
              params={{ id: req.id }}
            />
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="border-t border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="sm" variant="ghost" className="h-8 px-2 gap-1 text-[11px]"
            onClick={async (e) => {
              e.stopPropagation();
              const t = toast.loading("جاري تجهيز الفاتورة…");
              try { await downloadInvoicePDF(inv); toast.success("تم تحميل الفاتورة", { id: t }); }
              catch { toast.error("تعذّر إنشاء الملف", { id: t }); }
            }}
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
          {isPaid && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> مسددة
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={isPaid || isCancelled ? "outline" : "default"}
          className="h-8 gap-1.5 text-[11px]"
          onClick={onOpen}
        >
          {isPaid || isCancelled ? "التفاصيل" : (<><CreditCard className="h-3.5 w-3.5" /> ادفع الآن</>)}
          <ArrowLeft className="h-3 w-3" />
        </Button>
      </div>
    </motion.article>
  );
}

function LinkChip({
  icon: Icon, label, value, mono, to, params,
}: {
  icon: any; label: string; value: string; mono?: boolean;
  to?: string; params?: Record<string, string>;
}) {
  const body = (
    <span className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] hover:border-primary/50 hover:bg-primary/5 transition-colors group/chip">
      <span className="flex items-center gap-1.5 min-w-0">
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-muted-foreground font-bold shrink-0">{label}</span>
        <span className={cn("truncate text-foreground font-semibold", mono && "font-mono")} dir={mono ? "ltr" : undefined}>{value}</span>
      </span>
      {to && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover/chip:opacity-100 transition-opacity shrink-0" />}
    </span>
  );
  if (!to) return body;
  return (
    <Link to={to as any} params={params as any} onClick={(e) => e.stopPropagation()}>
      {body}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 py-16 flex flex-col items-center justify-center text-center gap-2">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted">
        <Receipt className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-bold">لا توجد فواتير</h3>
      <p className="text-[11.5px] text-muted-foreground max-w-xs">فواتير الخدمات والمشاريع ستظهر هنا فور إصدارها من قِبَل الإدارة.</p>
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
