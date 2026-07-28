import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Wallet2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Quote = {
  contractCode: string;
  outstandingPrincipal: number;
  accruedInterest: number;
  earlyRepaymentFee: number;
  interestRebate: number;
  totalPayoff: number;
};

type Request = {
  id: string; status: "REQUESTED" | "APPROVED" | "REJECTED" | "SETTLED" | "CANCELLED";
  totalPayoff: string | number; createdAt: string; adminNote?: string | null; clientNote?: string | null;
};

const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_AR: Record<string, string> = {
  REQUESTED: "بانتظار المراجعة",
  APPROVED: "تمت الموافقة",
  REJECTED: "مرفوض",
  SETTLED: "تم السداد وإغلاق العقد",
  CANCELLED: "ملغى",
};

export function EarlySettlementPanel({ contractId }: { contractId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  const quote = useQuery({
    queryKey: ["fin-payoff", contractId],
    queryFn: () => api.get<Quote>(`/financing/contracts/${contractId}/early-settlement/quote`).then((r) => r.data),
    refetchInterval: 30000,
  });

  const requests = useQuery({
    queryKey: ["fin-payoff-requests", contractId],
    queryFn: () => api.get<{ requests: Request[] }>(`/financing/contracts/${contractId}/early-settlement`).then((r) => r.data.requests),
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/financing/contracts/${contractId}/early-settlement`, { note: note.trim() || undefined }),
    onSuccess: () => {
      toast.success("📥 تم إرسال طلب السداد المبكر — سيتم إشعارك بعد المراجعة");
      setOpen(false); setNote("");
      qc.invalidateQueries({ queryKey: ["fin-payoff-requests", contractId] });
    },
    onError: (e) => toast.error(apiError(e) || "تعذر إرسال الطلب"),
  });

  const active = requests.data?.find((r) => r.status === "REQUESTED" || r.status === "APPROVED");
  const lastSettled = requests.data?.find((r) => r.status === "SETTLED");

  if (lastSettled) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3 text-xs">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <div>
          <div className="font-bold text-emerald-300">تم إغلاق العقد بالسداد المبكر</div>
          <div className="text-emerald-200/80 mt-0.5">
            المبلغ المسدد: {money(lastSettled.totalPayoff)} ر.س • بتاريخ {new Date(lastSettled.createdAt).toLocaleDateString("ar-SA")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-electric/25 bg-gradient-to-br from-electric/10 via-white/[0.02] to-transparent p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Wallet2 className="h-5 w-5 text-electric" />
        <div className="font-bold text-sm">السداد المبكر وإغلاق العقد</div>
      </div>

      {quote.data && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Row k="أصل المتبقي" v={`${money(quote.data.outstandingPrincipal)} ر.س`} />
          <Row k="أرباح مستحقة" v={`${money(quote.data.accruedInterest)} ر.س`} />
          <Row k="رسوم السداد المبكر" v={`${money(quote.data.earlyRepaymentFee)} ر.س`} />
          <Row k="خصم الأرباح المستقبلية" v={`- ${money(quote.data.interestRebate)} ر.س`} accent="emerald" />
          <div className="col-span-2 rounded-xl border border-electric/30 bg-electric/10 p-3 flex items-center justify-between">
            <span className="text-slate-200 font-semibold">إجمالي مبلغ السداد</span>
            <span className="text-electric font-bold tabular-nums">{money(quote.data.totalPayoff)} ر.س</span>
          </div>
        </div>
      )}

      {active && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <AlertCircle className="h-4 w-4" /> يوجد طلب {STATUS_AR[active.status]}
          </div>
          <div className="mt-1 text-amber-200/80">
            المبلغ: {money(active.totalPayoff)} ر.س • {new Date(active.createdAt).toLocaleString("ar-SA")}
          </div>
          {active.adminNote && <div className="mt-1 text-slate-300">ملاحظة الإدارة: {active.adminNote}</div>}
        </div>
      )}

      {!active && !open && (
        <Button size="sm" className="w-full" onClick={() => setOpen(true)}>طلب سداد مبكر وإغلاق العقد</Button>
      )}

      {!active && open && (
        <div className="space-y-2">
          <Textarea placeholder="ملاحظة اختيارية للإدارة" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "جارٍ الإرسال…" : "تأكيد الطلب"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          </div>
          <div className="text-[10px] text-muted-foreground">
            سيتم خصم مبلغ السداد من رصيد محفظتك بعد موافقة الإدارة. تأكد من توفر الرصيد الكافي.
          </div>
        </div>
      )}

      {requests.data && requests.data.length > 0 && (
        <details className="text-[11px] text-muted-foreground">
          <summary className="cursor-pointer hover:text-slate-300">سجل الطلبات ({requests.data.length})</summary>
          <ul className="mt-2 space-y-1">
            {requests.data.map((r) => (
              <li key={r.id} className="flex justify-between border-t border-white/5 pt-1">
                <span>{new Date(r.createdAt).toLocaleDateString("ar-SA")} — {STATUS_AR[r.status]}</span>
                <span className="tabular-nums">{money(r.totalPayoff)} ر.س</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: "emerald" }) {
  return (
    <div className="flex justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-semibold tabular-nums ${accent === "emerald" ? "text-emerald-300" : ""}`}>{v}</span>
    </div>
  );
}
