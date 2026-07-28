import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, Gift, Copy, Check,
  Landmark, Sparkles, TrendingUp, Clock, CheckCircle2, XCircle, Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client/wallet")({
  component: ClientWallet,
});

const CURRENCY = "ر.س";

const BANK_FALLBACK = {
  beneficiary: "شركة علي صالح الشهري القابضة",
  bank: "بنك ساب (SAB)",
  iban: "SA3745000000262359391001",
  currency: "SAR",
};

const WALLET_FALLBACK = { balance: 0, cashbackBalance: 0 };

function fmtSar(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TX_LABEL: Record<string, string> = {
  TOPUP: "شحن رصيد",
  WITHDRAW: "سحب رصيد",
  PAYMENT: "سداد فاتورة",
  REFUND: "استرداد",
  CASHBACK: "كاش باك",
  ADJUSTMENT: "تعديل يدوي",
};

const STATUS_LABEL: Record<string, { label: string; className: string; icon: any }> = {
  PENDING: { label: "قيد المراجعة", className: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: Clock },
  APPROVED: { label: "مُعتمد", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  REJECTED: { label: "مرفوض", className: "bg-rose-500/10 text-rose-600 border-rose-500/30", icon: XCircle },
};

function ClientWallet() {
  const qc = useQueryClient();
  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["wallet-me"],
    queryFn: async () => (await api.get("/wallet/me")).data,
    refetchInterval: 6000,
    placeholderData: (prev) => prev ?? { wallet: WALLET_FALLBACK, transactions: [], bank: BANK_FALLBACK, cashbackRate: 0.0185 },
    staleTime: 3000,
  });

  const wallet = q.data?.wallet ?? WALLET_FALLBACK;
  const transactions = q.data?.transactions ?? [];
  const bank = q.data?.bank ?? BANK_FALLBACK;
  const cashbackRate = q.data?.cashbackRate ?? 0.0185;

  const copy = async (val: string, key: string) => {
    await navigator.clipboard.writeText(val);
    setCopied(key);
    toast.success("تم النسخ");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="المحفظة الرقمية"
        description="محفظة بنكية متكاملة — شحن، سحب، سداد وكاش باك تلقائي 1.85% على كل فاتورة"
        icon={Wallet}
      />

      {/* Hero balance card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-2xl">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <CardContent className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs opacity-90 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span>الرصيد المتاح</span>
                </div>
                {q.isLoading ? (
                  <Skeleton className="h-14 w-64 bg-white/20" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums">
                      {fmtSar(wallet?.balance)}
                    </span>
                    <span className="text-lg font-semibold opacity-80">{CURRENCY}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs opacity-90">
                  <Gift className="h-3.5 w-3.5" />
                  <span>كاش باك مُتراكم: <b className="tabular-nums">{fmtSar(wallet?.cashbackBalance)} {CURRENCY}</b></span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 bg-white text-primary hover:bg-white/90 shadow-lg"
                  onClick={() => setTopupOpen(true)}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  شحن الرصيد
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-white/40 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => setWithdrawOpen(true)}
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  سحب
                </Button>
              </div>
            </div>

            {/* Feature strip */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: TrendingUp, label: `${(cashbackRate * 100).toFixed(2)}% كاش باك` },
                { icon: Zap, label: "فوري عبر الواتساب" },
                { icon: Landmark, label: "تحويل بنكي آمن" },
              ].map((f, i) => (
                <div key={i} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-3">
                  <f.icon className="h-4 w-4 mx-auto opacity-90" />
                  <p className="text-[11px] mt-1 font-semibold">{f.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bank info + coming soon */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">تحويل بنكي</p>
                  <p className="text-[11px] text-muted-foreground">حساب الشركة الرسمي</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">متاح</span>
            </div>
            {bank && (
              <div className="space-y-2 text-sm">
                <BankRow k="المستفيد" v={bank.beneficiary} onCopy={(v) => copy(v, "b")} copied={copied === "b"} />
                <BankRow k="البنك" v={bank.bank} onCopy={(v) => copy(v, "bk")} copied={copied === "bk"} />
                <BankRow k="IBAN" v={bank.iban} mono onCopy={(v) => copy(v, "iban")} copied={copied === "iban"} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CreditCardIcon />
                </div>
                <div>
                  <p className="text-sm font-bold">الدفع الإلكتروني</p>
                  <p className="text-[11px] text-muted-foreground">مدى · فيزا · Apple Pay</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">قريباً</span>
            </div>
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Sparkles className="h-8 w-8 mx-auto text-primary/60" />
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                نعمل حالياً على تفعيل بوابة الدفع الإلكتروني الرسمية.<br/>
                استخدم التحويل البنكي أو المحفظة الرقمية للدفع الفوري.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">آخر الحركات</h3>
            <span className="text-[11px] text-muted-foreground">تحديث مباشر</span>
          </div>
          {q.isLoading ? (
            <div className="space-y-2">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">لا توجد حركات بعد</p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {transactions.map((tx: any, idx: number) => {
                  const amount = Number(tx.amount);
                  const positive = amount >= 0;
                  const S = STATUS_LABEL[tx.status] ?? STATUS_LABEL.PENDING;
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition"
                    >
                      <div className={cn(
                        "grid h-10 w-10 place-items-center rounded-lg shrink-0",
                        tx.type === "CASHBACK" ? "bg-fuchsia-500/10 text-fuchsia-600" :
                        positive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                      )}>
                        {tx.type === "CASHBACK" ? <Gift className="h-4 w-4" /> :
                         positive ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold">{TX_LABEL[tx.type] ?? tx.type}</span>
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1", S.className)}>
                            <S.icon className="h-2.5 w-2.5" />
                            {S.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {tx.note || tx.reference || "—"} · {formatDate(tx.createdAt)}
                        </p>
                      </div>
                      <div className={cn(
                        "text-sm font-black tabular-nums shrink-0",
                        positive ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {positive ? "+" : ""}{fmtSar(amount)}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <TopupDialog open={topupOpen} onOpenChange={setTopupOpen} bank={bank} onDone={() => qc.invalidateQueries({ queryKey: ["wallet-me"] })} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={Number(wallet?.balance ?? 0)} onDone={() => qc.invalidateQueries({ queryKey: ["wallet-me"] })} />
    </div>
  );
}

function CreditCardIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
}

function BankRow({ k, v, mono, onCopy, copied }: { k: string; v: string; mono?: boolean; onCopy: (v: string) => void; copied: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0">{k}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={cn("text-sm font-semibold truncate", mono && "font-mono")} dir={mono ? "ltr" : undefined}>{v}</span>
        <button onClick={() => onCopy(v)} className="p-1 rounded hover:bg-muted transition">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}

function TopupDialog({ open, onOpenChange, bank, onDone }: any) {
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: async () => (await api.post("/wallet/topup", { amount: Number(amount), bankRef: ref || null, note: note || null })).data,
    onSuccess: () => { toast.success("تم إرسال طلب الشحن — بانتظار مراجعة الإدارة"); onDone(); onOpenChange(false); setAmount(""); setRef(""); setNote(""); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "تعذّر إرسال الطلب"),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-primary" />شحن المحفظة</DialogTitle></DialogHeader>
        {bank && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <p className="font-bold text-foreground">حوّل المبلغ على:</p>
            <p>{bank.beneficiary} — {bank.bank}</p>
            <p className="font-mono" dir="ltr">{bank.iban}</p>
          </div>
        )}
        <div className="space-y-3">
          <div><Label>المبلغ (ر.س)</Label><Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
          <div><Label>المرجع البنكي (اختياري)</Label><Input value={ref} onChange={e => setRef(e.target.value)} placeholder="رقم عملية التحويل" /></div>
          <div><Label>ملاحظة</Label><Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} /></div>
          <Button className="w-full" disabled={!amount || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "جارِ الإرسال..." : "إرسال طلب الشحن"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({ open, onOpenChange, balance, onDone }: any) {
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: async () => (await api.post("/wallet/withdraw", { amount: Number(amount), iban, note: note || null })).data,
    onSuccess: () => { toast.success("تم إرسال طلب السحب"); onDone(); onOpenChange(false); setAmount(""); setIban(""); setNote(""); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "تعذّر إرسال الطلب"),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowUpFromLine className="h-5 w-5 text-primary" />سحب من المحفظة</DialogTitle></DialogHeader>
        <div className="text-xs text-muted-foreground">الرصيد المتاح: <b className="text-foreground">{fmtSar(balance)} ر.س</b></div>
        <div className="space-y-3">
          <div><Label>المبلغ</Label><Input type="number" max={balance} value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><Label>IBAN حسابك البنكي</Label><Input dir="ltr" value={iban} onChange={e => setIban(e.target.value.toUpperCase())} placeholder="SA00..." className="font-mono" /></div>
          <div><Label>ملاحظة</Label><Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} /></div>
          <Button className="w-full" disabled={!amount || !iban || m.isPending || Number(amount) > balance} onClick={() => m.mutate()}>
            {m.isPending ? "جارِ الإرسال..." : "إرسال طلب السحب"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
