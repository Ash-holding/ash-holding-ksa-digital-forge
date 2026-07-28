import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Info } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/affiliate/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { data } = useQuery({
    queryKey: ["affiliate-dashboard"],
    queryFn: async () => (await api.get("/affiliate/dashboard")).data as {
      balances: { pending: number; available: number; reserved: number; paid: number; withdrawable: number };
    },
  });

  const b = data?.balances || { pending: 0, available: 0, reserved: 0, paid: 0, withdrawable: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المحفظة والسحب</h1>
        <p className="text-sm text-muted-foreground">راجع رصيدك واطلب سحب أرباحك.</p>
      </div>

      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 md:p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-4">
          <Wallet className="h-7 w-7 text-white" />
        </div>
        <div className="text-xs text-muted-foreground">الرصيد القابل للسحب</div>
        <div className="text-5xl font-bold tabular-nums mt-2">{b.withdrawable.toFixed(2)}</div>
        <div className="text-sm text-muted-foreground mt-1">ريال سعودي</div>
        <button
          disabled
          className="mt-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 text-sm font-bold text-white opacity-60 cursor-not-allowed"
        >
          طلب سحب (قريباً)
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "معلّق", value: b.pending, color: "text-amber-500" },
          { label: "متاح", value: b.available, color: "text-emerald-500" },
          { label: "محجوز", value: b.reserved, color: "text-blue-500" },
          { label: "مدفوع", value: b.paid, color: "text-slate-400" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className={`text-2xl font-bold tabular-nums mt-1 ${c.color}`}>{c.value.toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3 text-sm">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-muted-foreground leading-loose">
          العمولات تُحتسب فور نجاح الدفع وتبقى <b>معلّقة</b> حتى انتهاء فترة الاسترجاع، ثم تنتقل إلى <b>متاح</b> ويمكن طلب سحبها.
          المدفوعات تتم عبر التحويل البنكي خلال 3 أيام عمل بعد الموافقة.
        </div>
      </div>
    </div>
  );
}
