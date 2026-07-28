import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Wallet, Search, Check, X, Plus, Minus, TrendingUp, Clock,
  CheckCircle2, XCircle, ArrowDownToLine, ArrowUpFromLine, Gift,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/wallet")({
  component: AdminWallet,
});

const fmt = (n: any) => Number(n ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TX_LABEL: Record<string, string> = {
  TOPUP: "شحن", WITHDRAW: "سحب", PAYMENT: "سداد", REFUND: "استرداد", CASHBACK: "كاش باك", ADJUSTMENT: "تعديل",
};

function AdminWallet() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "wallets" | "history">("pending");
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState<{ open: boolean; clientId?: string; name?: string }>({ open: false });

  const walletsQ = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => (await api.get("/wallet/admin/wallets")).data.wallets,
    refetchInterval: 8000,
  });
  const txQ = useQuery({
    queryKey: ["admin-wallet-tx"],
    queryFn: async () => (await api.get("/wallet/transactions", { params: { pageSize: 100 } })).data.rows,
    refetchInterval: 6000,
  });

  const wallets = walletsQ.data ?? [];
  const transactions = txQ.data ?? [];

  const filteredWallets = useMemo(() =>
    (wallets as any[]).filter(w => {
      const q = search.toLowerCase();
      return !q || w.client?.user?.name?.toLowerCase().includes(q) || w.client?.user?.phone?.includes(q) || w.client?.user?.email?.toLowerCase().includes(q);
    }), [wallets, search]);

  const pending = useMemo(() => (transactions as any[]).filter(t => t.status === "PENDING"), [transactions]);
  const history = useMemo(() => (transactions as any[]).filter(t => t.status !== "PENDING"), [transactions]);

  const totals = useMemo(() => {
    const w = wallets as any[];
    return {
      count: w.length,
      totalBalance: w.reduce((s, x) => s + Number(x.balance ?? 0), 0),
      totalCashback: w.reduce((s, x) => s + Number(x.cashbackBalance ?? 0), 0),
      pendingCount: pending.length,
    };
  }, [wallets, pending]);

  const approve = useMutation({
    mutationFn: async (id: string) => (await api.post(`/wallet/admin/transactions/${id}/approve`)).data,
    onSuccess: () => { toast.success("تم الاعتماد وإشعار العميل"); qc.invalidateQueries({ queryKey: ["admin-wallets"] }); qc.invalidateQueries({ queryKey: ["admin-wallet-tx"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "فشل الاعتماد"),
  });
  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => (await api.post(`/wallet/admin/transactions/${id}/reject`, { reason })).data,
    onSuccess: () => { toast.success("تم رفض الطلب"); qc.invalidateQueries({ queryKey: ["admin-wallet-tx"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "فشل الرفض"),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="المحافظ الرقمية"
        description="إدارة محافظ العملاء — اعتماد الشحن والسحب، تعديل الأرصدة وتتبع الحركة اللحظية"
        icon={Wallet}
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "إجمالي المحافظ", value: totals.count, icon: Wallet, color: "text-primary" },
          { label: "إجمالي الأرصدة", value: `${fmt(totals.totalBalance)} ر.س`, icon: TrendingUp, color: "text-emerald-600" },
          { label: "كاش باك مُتراكم", value: `${fmt(totals.totalCashback)} ر.س`, icon: Gift, color: "text-fuchsia-600" },
          { label: "طلبات قيد المراجعة", value: totals.pendingCount, icon: Clock, color: "text-amber-600" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <s.icon className={cn("h-4 w-4", s.color)} />
                </div>
                <p className="text-xl font-black mt-2 tabular-nums">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
        {[
          { id: "pending", label: `قيد المراجعة (${totals.pendingCount})` },
          { id: "wallets", label: "المحافظ" },
          { id: "history", label: "السجل" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition",
              tab === t.id ? "bg-background shadow" : "text-muted-foreground hover:text-foreground")}
          >{t.label}</button>
        ))}
      </div>

      {/* Pending */}
      {tab === "pending" && (
        <Card>
          <CardContent className="p-4">
            {txQ.isLoading ? (
              <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : pending.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">لا توجد طلبات قيد المراجعة</p>
            ) : (
              <div className="space-y-2">
                {pending.map((tx: any) => (
                  <PendingRow key={tx.id} tx={tx}
                    onApprove={() => approve.mutate(tx.id)}
                    onReject={(r) => reject.mutate({ id: tx.id, reason: r })}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Wallets */}
      {tab === "wallets" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الجوال..." className="pr-10" />
            </div>
            {walletsQ.isLoading ? (
              <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] text-muted-foreground border-b border-border">
                    <tr><th className="text-right py-2">العميل</th><th className="text-center">الرصيد</th><th className="text-center">الكاش باك</th><th className="text-center">آخر تحديث</th><th /></tr>
                  </thead>
                  <tbody>
                    {filteredWallets.map((w: any) => (
                      <tr key={w.id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2">
                          <div className="font-semibold">{w.client?.user?.name ?? "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{w.client?.user?.phone ?? w.client?.user?.email}</div>
                        </td>
                        <td className="text-center font-black tabular-nums text-emerald-600">{fmt(w.balance)}</td>
                        <td className="text-center tabular-nums text-fuchsia-600">{fmt(w.cashbackBalance)}</td>
                        <td className="text-center text-[11px] text-muted-foreground">{formatDate(w.updatedAt)}</td>
                        <td className="text-left">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setAdjustOpen({ open: true, clientId: w.clientId, name: w.client?.user?.name })}>
                            <Plus className="h-3 w-3" />تعديل
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {tab === "history" && (
        <Card>
          <CardContent className="p-4">
            {txQ.isLoading ? (
              <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-14" />)}</div>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">لا سجل حتى الآن</p>
            ) : (
              <div className="space-y-2">
                {history.map((tx: any) => {
                  const positive = Number(tx.amount) >= 0;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
                      <div className={cn("grid h-9 w-9 place-items-center rounded-lg",
                        tx.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                        {tx.status === "APPROVED" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold">{tx.wallet?.client?.user?.name ?? "—"} · {TX_LABEL[tx.type] ?? tx.type}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{tx.note || tx.reference || ""} · {formatDate(tx.approvedAt || tx.createdAt)}</div>
                      </div>
                      <div className={cn("text-sm font-black tabular-nums", positive ? "text-emerald-600" : "text-rose-600")}>
                        {positive ? "+" : ""}{fmt(tx.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AdjustDialog state={adjustOpen} setState={setAdjustOpen} onDone={() => { qc.invalidateQueries({ queryKey: ["admin-wallets"] }); qc.invalidateQueries({ queryKey: ["admin-wallet-tx"] }); }} />
    </div>
  );
}

function PendingRow({ tx, onApprove, onReject }: any) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const isTopup = tx.type === "TOPUP";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
      <div className={cn("grid h-10 w-10 place-items-center rounded-lg shrink-0",
        isTopup ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
        {isTopup ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{tx.wallet?.client?.user?.name ?? "—"} · {isTopup ? "طلب شحن" : "طلب سحب"}</div>
        <div className="text-[11px] text-muted-foreground">
          {formatDate(tx.createdAt)}
          {tx.bankRef ? ` · مرجع: ${tx.bankRef}` : ""}
          {tx.iban ? ` · IBAN: ${tx.iban}` : ""}
        </div>
        {tx.note && <div className="text-[11px] text-muted-foreground truncate mt-0.5">{tx.note}</div>}
      </div>
      <div className="text-lg font-black tabular-nums shrink-0">{fmt(tx.amount)} ر.س</div>
      <div className="flex gap-2">
        <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={onApprove}>
          <Check className="h-3.5 w-3.5" />اعتماد
        </Button>
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <Button size="sm" variant="destructive" className="gap-1" onClick={() => setRejectOpen(true)}>
            <X className="h-3.5 w-3.5" />رفض
          </Button>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader><DialogTitle>سبب الرفض</DialogTitle></DialogHeader>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="اذكر السبب (سيصل للعميل عبر الواتساب)" />
            <Button variant="destructive" onClick={() => { onReject(reason); setRejectOpen(false); setReason(""); }}>تأكيد الرفض</Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function AdjustDialog({ state, setState, onDone }: any) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sign, setSign] = useState<"+" | "-">("+");
  const m = useMutation({
    mutationFn: async () => (await api.post("/wallet/admin/adjust", { clientId: state.clientId, amount: (sign === "+" ? 1 : -1) * Number(amount), note: note || null })).data,
    onSuccess: () => { toast.success("تم التعديل وإشعار العميل"); onDone(); setState({ open: false }); setAmount(""); setNote(""); setSign("+"); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "فشل التعديل"),
  });
  return (
    <Dialog open={state.open} onOpenChange={(o) => setState({ open: o, clientId: state.clientId, name: state.name })}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>تعديل رصيد — {state.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant={sign === "+" ? "default" : "outline"} size="sm" className="flex-1 gap-1" onClick={() => setSign("+")}><Plus className="h-3 w-3" />إضافة</Button>
            <Button variant={sign === "-" ? "default" : "outline"} size="sm" className="flex-1 gap-1" onClick={() => setSign("-")}><Minus className="h-3 w-3" />خصم</Button>
          </div>
          <div><Label>المبلغ (ر.س)</Label><Input type="number" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><Label>ملاحظة</Label><Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="سبب التعديل — سيرسل للعميل" /></div>
          <Button className="w-full" disabled={!amount || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "جارِ الحفظ..." : "تأكيد التعديل"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
