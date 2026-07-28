import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Search, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/financing/")({
  component: AdminFinancingIndex,
  head: () => ({ meta: [{ title: "طلبات التمويل — لوحة الإدارة" }] }),
});

type Row = {
  id: string; code: string; status: string;
  amount: number | string; termMonths: number; computedScore?: number | null;
  submittedAt: string | null; createdAt: string;
  fullNameAr: string | null;
  product: { nameAr: string; code: string; customerType: string } | null;
  _count: { documents: number; decisions: number };
};

const STATUSES = [
  { key: "", label: "الكل" },
  { key: "SUBMITTED", label: "جديدة" },
  { key: "KYC_REVIEW", label: "تحقق الهوية" },
  { key: "CREDIT_REVIEW", label: "دراسة ائتمانية" },
  { key: "RISK_REVIEW", label: "مخاطر" },
  { key: "COMMITTEE_REVIEW", label: "لجنة" },
  { key: "PENDING_FINAL", label: "اعتماد نهائي" },
  { key: "MORE_INFO", label: "بحاجة معلومات" },
  { key: "APPROVED", label: "معتمد" },
  { key: "REJECTED", label: "مرفوض" },
];

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
  KYC_REVIEW: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  KYC_APPROVED: "bg-blue-500/10 text-blue-300 ring-blue-500/20",
  KYC_REJECTED: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  CREDIT_REVIEW: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20",
  RISK_REVIEW: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
  COMMITTEE_REVIEW: "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20",
  PENDING_FINAL: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  MORE_INFO: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  REJECTED: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  DRAFT: "bg-slate-500/10 text-slate-300 ring-slate-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
};

function AdminFinancingIndex() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-financing-apps", status, q],
    queryFn: () => api.get<{ rows: Row[] }>("/admin/financing/applications", {
      params: { status: status || undefined, q: q || undefined },
    }).then((r) => r.data),
    refetchInterval: 15000,
  });

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title="طلبات التمويل"
        description="دراسة ومراجعة واعتماد طلبات تمويل خدمات ASH."
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالرقم أو الاسم أو الهوية…" value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              className={`text-[11px] px-2.5 py-1 rounded-full ring-1 transition ${status === s.key ? "bg-electric/20 text-electric ring-electric/30" : "bg-white/5 text-muted-foreground ring-white/10 hover:bg-white/10"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">جاري التحميل…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">لا توجد طلبات مطابقة.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-right px-3 py-2">الرقم</th>
                <th className="text-right px-3 py-2">المتقدم</th>
                <th className="text-right px-3 py-2">المنتج</th>
                <th className="text-right px-3 py-2">المبلغ</th>
                <th className="text-right px-3 py-2">النقاط</th>
                <th className="text-right px-3 py-2">الحالة</th>
                <th className="text-right px-3 py-2">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-white/5 cursor-pointer">
                  <td className="px-3 py-2">
                    <Link to="/admin/financing/$id" params={{ id: r.id }} className="font-mono text-xs text-electric hover:underline">
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to="/admin/financing/$id" params={{ id: r.id }} className="hover:underline">
                      {r.fullNameAr ?? "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.product?.nameAr ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{new Intl.NumberFormat("ar-SA").format(Number(r.amount))} ر.س</td>
                  <td className="px-3 py-2 tabular-nums text-xs">{r.computedScore ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ring-1 ${STATUS_STYLES[r.status] || "bg-slate-500/10 ring-slate-500/20"}`}>
                      {STATUSES.find((s) => s.key === r.status)?.label || r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.submittedAt || r.createdAt).toLocaleDateString("ar-SA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
