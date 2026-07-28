import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeDollarSign } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/affiliate/commissions")({
  component: CommissionsPage,
});

type Commission = {
  id: string; amount: string | number; status: string; orderRef?: string | null;
  createdAt: string; holdUntil?: string | null; availableAt?: string | null; paidAt?: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "معلّق", color: "bg-amber-500/10 text-amber-500" },
  AVAILABLE: { label: "متاح", color: "bg-emerald-500/10 text-emerald-500" },
  WITHDRAWAL_REQUESTED: { label: "قيد السحب", color: "bg-blue-500/10 text-blue-500" },
  PAID: { label: "مدفوع", color: "bg-slate-500/10 text-slate-400" },
  REVERSED: { label: "معكوس", color: "bg-rose-500/10 text-rose-500" },
  REJECTED: { label: "مرفوض", color: "bg-rose-500/10 text-rose-500" },
};

function CommissionsPage() {
  const [filter, setFilter] = useState<string>("");
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-commissions", filter],
    queryFn: async () => (await api.get("/affiliate/commissions", { params: filter ? { status: filter } : {} })).data as { items: Commission[] },
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">العمولات</h1>
        <p className="text-sm text-muted-foreground">سجل كامل لجميع العمولات المكتسبة.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${!filter ? "bg-amber-500 text-white" : "bg-muted"}`}>الكل</button>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${filter === k ? "bg-amber-500 text-white" : "bg-muted"}`}>
            {v.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <BadgeDollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="font-semibold">لا توجد عمولات</div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-right px-4 py-3">المرجع</th>
                <th className="text-right px-4 py-3">التاريخ</th>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="text-right px-4 py-3">متاح في</th>
                <th className="text-left px-4 py-3">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => {
                const s = STATUS_LABELS[c.status] || { label: c.status, color: "bg-muted" };
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{c.orderRef || c.id.slice(-8)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.availableAt ? formatDate(c.availableAt) : (c.holdUntil ? formatDate(c.holdUntil) : "—")}</td>
                    <td className="px-4 py-3 text-left font-bold tabular-nums">{Number(c.amount).toFixed(2)} ر.س</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
