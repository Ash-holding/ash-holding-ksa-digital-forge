import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Info, Plus, Trash2, Star, Loader2, X, CheckCircle2, Clock, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/affiliate/wallet")({
  component: WalletPage,
});

type Method = { id: string; name: string; type: string; minAmount: string | number | null };
type Account = { id: string; methodId: string; beneficiaryName: string; bankName: string | null; ibanMasked: string | null; isDefault: boolean; method: { name: string; type: string } };
type Withdrawal = {
  id: string; requestNumber: string; amount: string; fee: string; netAmount: string;
  status: string; createdAt: string; transferRef: string | null;
  account?: { beneficiaryName: string; bankName: string | null; ibanMasked: string | null } | null;
};

const STATUS_LABEL: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  NEW: { label: "قيد المراجعة", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: Clock },
  UNDER_REVIEW: { label: "قيد الدراسة", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: Clock },
  APPROVED: { label: "معتمد", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", Icon: CheckCircle2 },
  PROCESSING: { label: "قيد التحويل", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", Icon: Loader2 },
  PAID: { label: "تم الدفع", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 },
  REJECTED: { label: "مرفوض", cls: "bg-red-500/10 text-red-600 border-red-500/30", Icon: XCircle },
  CANCELLED: { label: "ملغى", cls: "bg-slate-500/10 text-slate-500 border-slate-500/30", Icon: XCircle },
};

function fmt(n: number | string) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(Number(n) || 0);
}

function WalletPage() {
  const qc = useQueryClient();
  const [openAcc, setOpenAcc] = useState(false);
  const [openReq, setOpenReq] = useState(false);

  const dashQ = useQuery({
    queryKey: ["affiliate-dashboard"],
    queryFn: async () => (await api.get("/affiliate/dashboard")).data as {
      balances: { pending: number; available: number; reserved: number; paid: number; withdrawable: number };
    },
    refetchInterval: 15000,
  });
  const accountsQ = useQuery({
    queryKey: ["affiliate-payout-accounts"],
    queryFn: async () => (await api.get("/affiliate/payout-accounts")).data.items as Account[],
  });
  const methodsQ = useQuery({
    queryKey: ["affiliate-payout-methods"],
    queryFn: async () => (await api.get("/affiliate/payout-methods")).data.items as Method[],
  });
  const withdrawalsQ = useQuery({
    queryKey: ["affiliate-withdrawals"],
    queryFn: async () => (await api.get("/affiliate/withdrawals")).data.items as Withdrawal[],
    refetchInterval: 20000,
  });

  const b = dashQ.data?.balances || { pending: 0, available: 0, reserved: 0, paid: 0, withdrawable: 0 };
  const accounts = accountsQ.data || [];
  const methods = methodsQ.data || [];
  const withdrawals = withdrawalsQ.data || [];

  const setDefault = useMutation({
    mutationFn: async (id: string) => (await api.post(`/affiliate/payout-accounts/${id}/default`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["affiliate-payout-accounts"] }); toast.success("تم تعيين الحساب الافتراضي"); },
  });
  const delAcc = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/affiliate/payout-accounts/${id}`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["affiliate-payout-accounts"] }); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "فشل الحذف"),
  });
  const cancelReq = useMutation({
    mutationFn: async (id: string) => (await api.post(`/affiliate/withdrawals/${id}/cancel`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["affiliate-dashboard"] });
      toast.success("تم إلغاء الطلب");
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "فشل الإلغاء"),
  });

  const hasOpen = withdrawals.some((w) => ["NEW", "UNDER_REVIEW", "APPROVED", "PROCESSING"].includes(w.status));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المحفظة والسحب</h1>
          <p className="text-sm text-muted-foreground">أدر حسابات السحب وطلبات صرف الأرباح.</p>
        </div>
      </div>

      {/* Balance hero */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 md:p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-4">
          <Wallet className="h-7 w-7 text-white" />
        </div>
        <div className="text-xs text-muted-foreground">الرصيد القابل للسحب</div>
        <div className="text-5xl font-bold tabular-nums mt-2">{fmt(b.withdrawable)}</div>
        <div className="text-sm text-muted-foreground mt-1">ريال سعودي</div>
        <button
          onClick={() => {
            if (accounts.length === 0) { toast.info("أضف حساب سحب أولاً"); setOpenAcc(true); return; }
            if (hasOpen) { toast.error("لديك طلب سحب قيد المعالجة"); return; }
            if (b.withdrawable <= 0) { toast.error("لا يوجد رصيد قابل للسحب"); return; }
            setOpenReq(true);
          }}
          className="mt-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition disabled:opacity-50"
        >
          طلب سحب الأرباح
        </button>
      </motion.div>

      {/* Buckets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "معلّق", value: b.pending, color: "text-amber-500" },
          { label: "متاح", value: b.available, color: "text-emerald-500" },
          { label: "محجوز", value: b.reserved, color: "text-blue-500" },
          { label: "مدفوع", value: b.paid, color: "text-slate-400" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className={`text-2xl font-bold tabular-nums mt-1 ${c.color}`}>{fmt(c.value)}</div>
          </div>
        ))}
      </div>

      {/* Accounts */}
      <section className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">حسابات السحب</h2>
          <button onClick={() => setOpenAcc(true)} className="flex items-center gap-1.5 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 font-semibold">
            <Plus className="h-4 w-4" /> إضافة حساب
          </button>
        </div>
        {accounts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">لم تُضف أي حساب بنكي بعد.</div>
        ) : (
          <div className="grid gap-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{a.beneficiaryName}</span>
                    {a.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30">افتراضي</span>}
                    <span className="text-[10px] text-muted-foreground">{a.method.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{a.bankName ? `${a.bankName} — ` : ""}{a.ibanMasked}</div>
                </div>
                <div className="flex items-center gap-1">
                  {!a.isDefault && (
                    <button onClick={() => setDefault.mutate(a.id)} title="تعيين افتراضي" className="p-2 rounded-lg hover:bg-muted">
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  <button onClick={() => { if (confirm("حذف هذا الحساب؟")) delAcc.mutate(a.id); }} title="حذف" className="p-2 rounded-lg hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Withdrawals list */}
      <section className="rounded-2xl border border-border bg-card/40 p-5">
        <h2 className="text-lg font-bold mb-4">طلبات السحب</h2>
        {withdrawals.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">لا توجد طلبات سحب بعد.</div>
        ) : (
          <div className="grid gap-2">
            {withdrawals.map((w) => {
              const s = STATUS_LABEL[w.status] || STATUS_LABEL.NEW;
              const canCancel = ["NEW", "UNDER_REVIEW"].includes(w.status);
              return (
                <motion.div key={w.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{w.requestNumber}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${s.cls} flex items-center gap-1`}>
                          <s.Icon className="h-3 w-3" /> {s.label}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{formatDate(w.createdAt)}</div>
                      {w.account && (
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {w.account.beneficiaryName} — {w.account.ibanMasked}
                        </div>
                      )}
                      {w.transferRef && (
                        <div className="text-xs text-emerald-600 mt-1">مرجع التحويل: <span className="font-mono">{w.transferRef}</span></div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold tabular-nums">{fmt(w.netAmount)} <span className="text-xs text-muted-foreground">ر.س</span></div>
                      <div className="text-[10px] text-muted-foreground">إجمالي {fmt(w.amount)} · رسوم {fmt(w.fee)}</div>
                      {canCancel && (
                        <button onClick={() => { if (confirm("إلغاء طلب السحب؟")) cancelReq.mutate(w.id); }}
                          className="mt-2 text-xs text-red-500 hover:underline">إلغاء الطلب</button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3 text-sm">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-muted-foreground leading-loose">
          العمولات تُحتسب فور نجاح الدفع وتبقى <b>معلّقة</b> حتى انتهاء فترة الاسترجاع، ثم تنتقل إلى <b>متاح</b> ويمكن طلب سحبها.
          المدفوعات تتم عبر التحويل البنكي خلال 3 أيام عمل بعد الموافقة.
        </div>
      </div>

      <AnimatePresence>
        {openAcc && (
          <AccountDialog
            methods={methods}
            onClose={() => setOpenAcc(false)}
            onCreated={() => { qc.invalidateQueries({ queryKey: ["affiliate-payout-accounts"] }); setOpenAcc(false); }}
          />
        )}
        {openReq && (
          <RequestDialog
            accounts={accounts}
            withdrawable={b.withdrawable}
            methods={methods}
            onClose={() => setOpenReq(false)}
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ["affiliate-withdrawals"] });
              qc.invalidateQueries({ queryKey: ["affiliate-dashboard"] });
              setOpenReq(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
      <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="w-full max-w-md rounded-2xl bg-card border border-border p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function AccountDialog({ methods, onClose, onCreated }: { methods: Method[]; onClose: () => void; onCreated: () => void }) {
  const [methodId, setMethodId] = useState(methods[0]?.id || "");
  const [beneficiaryName, setName] = useState("");
  const [bankName, setBank] = useState("");
  const [iban, setIban] = useState("");
  const [isDefault, setDefault] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/affiliate/payout-accounts", { methodId, beneficiaryName, bankName: bankName || null, iban, isDefault });
      toast.success("تمت إضافة الحساب");
      onCreated();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل إضافة الحساب");
    } finally { setBusy(false); }
  }

  return (
    <Modal title="إضافة حساب سحب" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">طريقة السحب</label>
          <select value={methodId} onChange={(e) => setMethodId(e.target.value)} required
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">اسم المستفيد (كما في الحساب)</label>
          <input value={beneficiaryName} onChange={(e) => setName(e.target.value)} required minLength={3}
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">اسم البنك (اختياري)</label>
          <input value={bankName} onChange={(e) => setBank(e.target.value)}
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="مثال: البنك الأهلي" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">رقم IBAN</label>
          <input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} required minLength={15}
            dir="ltr" className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
            placeholder="SA00 0000 0000 0000 0000 0000" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(e) => setDefault(e.target.checked)} />
          تعيين كحساب افتراضي
        </label>
        <button type="submit" disabled={busy}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} حفظ الحساب
        </button>
      </form>
    </Modal>
  );
}

function RequestDialog({ accounts, withdrawable, methods, onClose, onCreated }:
  { accounts: Account[]; withdrawable: number; methods: Method[]; onClose: () => void; onCreated: () => void }) {
  const def = accounts.find((a) => a.isDefault) || accounts[0];
  const [accountId, setAccountId] = useState(def?.id || "");
  const [amount, setAmount] = useState(withdrawable.toFixed(2));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = accounts.find((a) => a.id === accountId);
  const method = selected && methods.find((m) => m.id === selected.methodId);
  const min = Number(method?.minAmount || 100);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/affiliate/withdrawals", { accountId, amount: Number(amount), note: note || null });
      toast.success("تم إرسال طلب السحب");
      onCreated();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل إنشاء الطلب");
    } finally { setBusy(false); }
  }

  return (
    <Modal title="طلب سحب أرباح" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-lg bg-muted/40 p-3 text-sm flex items-center justify-between">
          <span className="text-muted-foreground">الرصيد القابل للسحب</span>
          <span className="font-bold tabular-nums">{fmt(withdrawable)} ر.س</span>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">حساب الاستلام</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.beneficiaryName} — {a.ibanMasked}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">المبلغ (ر.س)</label>
          <input type="number" step="0.01" min={min} max={withdrawable} value={amount}
            onChange={(e) => setAmount(e.target.value)} required
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
          <div className="text-[11px] text-muted-foreground mt-1">الحد الأدنى {min} ر.س</div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">ملاحظة (اختياري)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={busy || Number(amount) <= 0 || Number(amount) > withdrawable}
          className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2.5 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} إرسال طلب السحب
        </button>
      </form>
    </Modal>
  );
}
