import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Download, Receipt, CreditCard, User, Calendar,
  Wallet as WalletIcon, Landmark, Sparkles, Copy, Check, Send,
  BadgeCheck, Stamp,
} from "lucide-react";
import { api } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { downloadInvoicePDF } from "@/lib/invoice-print";
import { downloadReceiptPDF, type ReceiptLike } from "@/lib/receipt-print";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client/invoices/$id")({
  component: ClientInvoiceDetail,
});

const BANK = {
  beneficiary: "شركة علي صالح الشهري القابضة",
  bank: "بنك ساب (SAB)",
  iban: "SA3745000000262359391001",
};

type Method = "wallet" | "bank" | "electronic";

/** Build a printable receipt payload from the invoice + fresh payment data */
function buildReceipt(inv: any, payment?: any, walletBalance?: number): ReceiptLike {
  const p = payment ?? (inv?.payments ?? []).find((x: any) => x.status === "SUCCESS") ?? inv?.payments?.[0];
  const amt = Number(p?.amount ?? inv?.total ?? 0);
  const method = p?.method ?? "WALLET";
  return {
    receiptNumber: `RCP-${String(inv?.invoiceNumber ?? "").replace(/^INV-?/, "")}`,
    invoiceNumber: inv?.invoiceNumber,
    requestRef: inv?.requestRef ?? null,
    projectTitle: inv?.linkedRequest?.title ?? inv?.project?.title ?? null,
    clientName: inv?.client?.user?.name ?? null,
    clientCompany: inv?.client?.company ?? null,
    amount: amt,
    currency: inv?.currency ?? "SAR",
    method,
    paidAt: p?.paidAt ?? inv?.paidAt ?? new Date().toISOString(),
    cashback: method === "WALLET" ? +(amt * 0.0185).toFixed(2) : 0,
    balanceAfter: walletBalance != null ? walletBalance : null,
    paymentId: p?.id ?? null,
  };
}

function ClientInvoiceDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>("wallet");
  const [bankRef, setBankRef] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptLike | null>(null);

  const q = useQuery({
    queryKey: ["client-invoice", id],
    queryFn: async () => (await api.get(`/invoices/${id}`)).data.invoice,
    refetchInterval: 6000, refetchOnWindowFocus: true,
  });
  const walletQ = useQuery({
    queryKey: ["wallet-me"],
    queryFn: async () => (await api.get("/wallet/me")).data,
    refetchInterval: 10000,
  });

  const inv = q.data;
  const wallet = walletQ.data?.wallet;
  const walletBal = Number(wallet?.balance ?? 0);
  const total = Number(inv?.total ?? 0);
  const unpaid = inv && inv.status !== "PAID" && inv.status !== "CANCELLED";

  const payWallet = useMutation({
    mutationFn: async () => (await api.post(`/invoices/${id}/pay-wallet`)).data,
    onSuccess: (data) => {
      setReceipt(buildReceipt(inv, data?.payment, data?.wallet?.balance != null ? Number(data.wallet.balance) : undefined));
      toast.success("تم سداد الفاتورة من المحفظة ✅ — إيصالك جاهز للتحميل");
      qc.invalidateQueries({ queryKey: ["client-invoice", id] });
      qc.invalidateQueries({ queryKey: ["wallet-me"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "تعذّر السداد"),
  });
  const submitTransfer = useMutation({
    mutationFn: async () => (await api.post(`/invoices/${id}/submit-bank-transfer`, { bankRef })).data,
    onSuccess: () => {
      toast.success("تم إشعار الإدارة بالتحويل — سيتم تأكيده قريباً");
      setBankRef("");
      qc.invalidateQueries({ queryKey: ["client-invoice", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "تعذّر الإرسال"),
  });

  const copy = async (v: string, key: string) => {
    await navigator.clipboard.writeText(v);
    setCopied(key);
    toast.success("تم النسخ");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <DetailShell
      backTo="/client/invoices"
      icon={FileText}
      loading={q.isLoading}
      title={inv ? <span className="font-mono" dir="ltr">{inv.invoiceNumber}</span> : "—"}
      subtitle={inv ? `صادرة في ${formatDate(inv.issueDate || inv.createdAt)}` : undefined}
      status={inv && <StatusBadge value={inv.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
      actions={inv && (
        <Button size="sm" className="gap-1.5" onClick={() => downloadInvoicePDF(inv)}>
          <Download className="h-4 w-4" />تحميل PDF
        </Button>
      )}
    >
      {q.isLoading || !inv ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <DetailSection title="ملخص الفاتورة" icon={Receipt}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KV k="المبلغ الإجمالي" v={<Money value={inv.total} className="text-electric font-black text-base" />} />
                <KV k="المبلغ الفرعي" v={<Money value={inv.subtotal} />} />
                <KV k="الضريبة" v={<Money value={inv.taxAmount} />} />
                <KV k="الخصم" v={<Money value={inv.discount ?? 0} />} />
                <KV k="تاريخ الاستحقاق" v={formatDate(inv.dueAt)} />
                <KV k="تاريخ الدفع" v={formatDate(inv.paidAt)} />
              </div>
            </DetailSection>

            {/* PAYMENT METHODS */}
            {unpaid && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <DetailSection title="اختر طريقة الدفع" icon={CreditCard}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <MethodCard
                      active={method === "wallet"}
                      onClick={() => setMethod("wallet")}
                      icon={WalletIcon}
                      title="المحفظة الرقمية"
                      subtitle={`رصيدك: ${walletBal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`}
                      badge="فوري"
                      badgeColor="bg-emerald-500/10 text-emerald-600"
                    />
                    <MethodCard
                      active={method === "bank"}
                      onClick={() => setMethod("bank")}
                      icon={Landmark}
                      title="تحويل بنكي"
                      subtitle="بنك ساب — حساب الشركة"
                      badge="متاح"
                      badgeColor="bg-primary/10 text-primary"
                    />
                    <MethodCard
                      active={false}
                      onClick={() => toast.info("الدفع الإلكتروني قريباً")}
                      icon={Sparkles}
                      title="دفع إلكتروني"
                      subtitle="مدى · فيزا · Apple Pay"
                      badge="قريباً"
                      badgeColor="bg-amber-500/10 text-amber-600"
                      disabled
                    />
                  </div>

                  {method === "wallet" && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">المبلغ المستحق</p>
                          <p className="text-2xl font-black text-primary tabular-nums">{total.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground">بعد السداد</p>
                          <p className={cn("text-lg font-bold tabular-nums", walletBal - total < 0 ? "text-rose-600" : "text-emerald-600")}>
                            {(walletBal - total).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                          </p>
                        </div>
                      </div>
                      {walletBal < total ? (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-400">
                          الرصيد غير كافٍ — اشحن محفظتك أو اختر التحويل البنكي.
                        </div>
                      ) : (
                        <Button className="w-full gap-2" size="lg" disabled={payWallet.isPending} onClick={() => payWallet.mutate()}>
                          <WalletIcon className="h-4 w-4" />
                          {payWallet.isPending ? "جارِ السداد..." : `سداد ${total.toLocaleString("ar-SA")} ر.س من المحفظة`}
                        </Button>
                      )}
                      <p className="text-[11px] text-muted-foreground text-center mt-2">
                        ستحصل على كاش باك 1.85% تلقائياً بعد السداد
                      </p>
                    </div>
                  )}

                  {method === "bank" && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">حوّل المبلغ إلى الحساب أدناه ثم أرسل مرجع التحويل:</p>
                      <div className="space-y-2 rounded-lg bg-background p-3 border border-border">
                        <BankLine k="المستفيد" v={BANK.beneficiary} onCopy={(v) => copy(v, "b")} copied={copied === "b"} />
                        <BankLine k="البنك" v={BANK.bank} onCopy={(v) => copy(v, "bk")} copied={copied === "bk"} />
                        <BankLine k="IBAN" v={BANK.iban} mono onCopy={(v) => copy(v, "iban")} copied={copied === "iban"} />
                        <BankLine k="المبلغ" v={`${total.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`} onCopy={(v) => copy(String(total), "amt")} copied={copied === "amt"} />
                      </div>
                      <div>
                        <Label className="text-xs">رقم مرجع التحويل (اختياري)</Label>
                        <Input value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder="مثال: TR9823..." dir="ltr" className="font-mono" />
                      </div>
                      <Button className="w-full gap-2" onClick={() => submitTransfer.mutate()} disabled={submitTransfer.isPending}>
                        <Send className="h-4 w-4" />
                        {submitTransfer.isPending ? "جارِ الإرسال..." : "تأكيد التحويل وإشعار الإدارة"}
                      </Button>
                    </div>
                  )}
                </DetailSection>
              </motion.div>
            )}

            <DetailSection title="البنود" icon={FileText}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] text-muted-foreground border-b border-border">
                    <tr><th className="text-right py-2">البند</th><th className="text-center">الكمية</th><th className="text-center">السعر</th><th className="text-left">الإجمالي</th></tr>
                  </thead>
                  <tbody>
                    {(inv.items ?? []).map((it: any) => (
                      <tr key={it.id} className="border-b border-border/40">
                        <td className="py-2">{it.title}</td>
                        <td className="text-center">{it.quantity}</td>
                        <td className="text-center"><Money value={it.unitPrice} /></td>
                        <td className="text-left font-semibold"><Money value={it.total} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DetailSection>

            <DetailSection title="سجل الدفعات" icon={CreditCard}>
              {(inv.payments ?? []).length ? (
                <div className="divide-y divide-border/50">
                  {inv.payments.map((p: any) => (
                    <div key={p.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                      <div>
                        <div className="font-semibold"><Money value={p.amount} /></div>
                        <div className="text-[11px] text-muted-foreground">{p.method} · {formatDate(p.paidAt || p.createdAt)}</div>
                      </div>
                      <StatusBadge value={p.status} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground text-center py-4">لم يتم تسجيل أي دفعات بعد</p>}
            </DetailSection>
          </div>

          <div className="space-y-4">
            <DetailSection title="الملاحظات" icon={Calendar}>
              <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {inv.notes || "لا توجد ملاحظات"}
              </p>
            </DetailSection>
            <DetailSection title="بيانات الإصدار" icon={User}>
              <KV k="جهة الإصدار" v="ASH HOLDING" />
              <KV k="المرجع" v={inv.invoiceNumber} mono dir="ltr" />
              <KV k="العملة" v={inv.currency} />
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}

function MethodCard({ active, onClick, icon: Icon, title, subtitle, badge, badgeColor, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-right p-4 rounded-xl border-2 transition-all",
        active
          ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
          : disabled
          ? "border-border/50 opacity-60 cursor-not-allowed"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", badgeColor)}>{badge}</span>
      </div>
      <p className="text-sm font-bold">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
    </button>
  );
}

function BankLine({ k, v, mono, onCopy, copied }: { k: string; v: string; mono?: boolean; onCopy: (v: string) => void; copied: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0">{k}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={cn("text-sm font-semibold truncate", mono && "font-mono")} dir={mono ? "ltr" : undefined}>{v}</span>
        <button onClick={() => onCopy(v)} className="p-1 rounded hover:bg-muted transition">
          {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}
