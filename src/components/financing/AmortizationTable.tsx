import { motion } from "framer-motion";

type Row = {
  n: number;
  dueDate: string;
  principal: number | string;
  interest: number | string;
  fees?: number | string;
  total: number | string;
  balanceAfter?: number | string;
  balance?: number | string;
  status?: string;
  paidAt?: string | null;
};

const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateAr = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "short", day: "numeric" }) : "—";

const statusChip = (s?: string) => {
  const map: Record<string, string> = {
    PAID: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    PENDING: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    OVERDUE: "bg-red-500/15 text-red-400 border-red-500/30",
    WAIVED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };
  const label: Record<string, string> = {
    PAID: "مسدد", PENDING: "غير مسدد", OVERDUE: "متأخر", WAIVED: "معفى",
  };
  const k = s || "PENDING";
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${map[k]}`}>{label[k] || k}</span>;
};

export function AmortizationTable({
  rows,
  onPay,
  canPay = false,
  compact = false,
}: {
  rows: Row[];
  onPay?: (n: number) => void;
  canPay?: boolean;
  compact?: boolean;
}) {
  if (!rows?.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
        لا يوجد جدول أقساط بعد.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
      <div className="max-h-[520px] overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
            <tr className="text-slate-400">
              <th className="p-2 text-center">#</th>
              <th className="p-2 text-center">الاستحقاق</th>
              <th className="p-2 text-center">الأصل</th>
              <th className="p-2 text-center">الربح</th>
              <th className="p-2 text-center">القسط</th>
              {!compact && <th className="p-2 text-center">الرصيد المتبقي</th>}
              <th className="p-2 text-center">الحالة</th>
              {canPay && <th className="p-2"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <motion.tr
                key={r.n}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015 }}
                className="border-t border-white/5 hover:bg-white/5"
              >
                <td className="p-2 text-center font-bold text-slate-200">{r.n}</td>
                <td className="p-2 text-center text-slate-300">{dateAr(r.dueDate)}</td>
                <td className="p-2 text-center tabular-nums">{money(r.principal)}</td>
                <td className="p-2 text-center tabular-nums text-slate-400">{money(r.interest)}</td>
                <td className="p-2 text-center font-bold tabular-nums text-amber-300">{money(r.total)}</td>
                {!compact && <td className="p-2 text-center tabular-nums text-slate-400">{money(r.balanceAfter ?? r.balance)}</td>}
                <td className="p-2 text-center">{statusChip(r.status)}</td>
                {canPay && (
                  <td className="p-2 text-center">
                    {r.status !== "PAID" && (
                      <button
                        onClick={() => onPay?.(r.n)}
                        className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30"
                      >
                        تسجيل السداد
                      </button>
                    )}
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
