import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate as animateMV } from "framer-motion";
import QRCode from "qrcode";
import {
  FileText, Download, Receipt, CreditCard, User, Calendar,
  Wallet as WalletIcon, Landmark, Sparkles, Copy, Check, Send,
  BadgeCheck, Stamp, ArrowUpRight, ArrowDownLeft, RotateCcw, Wrench,
  AlertTriangle, RefreshCw, X, Building2, Hash, Printer, QrCode,
  ShieldCheck, ExternalLink,
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
import { downloadInvoicePDF, computeInvoiceHash, signatureIdFromHash } from "@/lib/invoice-print";
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
  const [payError, setPayError] = useState<string | null>(null);
  const navigate = useNavigate();

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
  const insufficientFunds = !!payError && /رصيد|الرصيد/.test(payError);

  const payWallet = useMutation({
    mutationFn: async () => (await api.post(`/invoices/${id}/pay-wallet`)).data,
    onMutate: () => setPayError(null),
    onSuccess: (data) => {
      // Instant status flip — write the paid invoice straight into the cache
      qc.setQueryData(["client-invoice", id], (old: any) =>
        old ? { ...old, ...data.invoice, items: old.items, linkedRequest: old.linkedRequest, requestRef: old.requestRef, walletTransactions: old.walletTransactions, payments: data.payment ? [...(old.payments ?? []), data.payment] : old.payments } : old,
      );
      if (data?.wallet) qc.setQueryData(["wallet-me"], (old: any) => (old ? { ...old, wallet: data.wallet } : old));
      const rc = buildReceipt(inv, data?.payment, data?.wallet?.balance != null ? Number(data.wallet.balance) : undefined);
      setReceipt(rc);
      toast.success("تم سداد الفاتورة بنجاح ✅", {
        description: `${total.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س من المحفظة · كاش باك +${(total * 0.0185).toFixed(2)} ر.س في طريقه لمحفظتك`,
        duration: 8000,
        action: { label: "تحميل الإيصال", onClick: () => downloadReceiptPDF(rc).catch(() => toast.error("تعذّر إنشاء الإيصال")) },
      });
      qc.invalidateQueries({ queryKey: ["client-invoice", id] });
      qc.invalidateQueries({ queryKey: ["wallet-me"] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "تعذّر إتمام السداد — تحقق من اتصالك وحاول مجدداً";
      setPayError(msg);
      toast.error("تعثّر السداد من المحفظة", { description: msg, duration: 6000 });
    },
  });
  const submitTransfer = useMutation({
    mutationFn: async () => (await api.post(`/invoices/${id}/submit-bank-transfer`, { bankRef })).data,
    onMutate: () => setPayError(null),
    onSuccess: () => {
      toast.success("تم إشعار الإدارة بالتحويل ✅", { description: "ستتحول الفاتورة إلى «مسددة» فور تأكيد الإدارة للتحويل", duration: 6000 });
      setBankRef("");
      qc.invalidateQueries({ queryKey: ["client-invoice", id] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || "تعذّر إرسال إشعار التحويل — حاول مجدداً";
      setPayError(msg);
      toast.error("تعثّر إرسال التحويل", { description: msg, duration: 6000 });
    },
  });

  const copy = async (v: string, key: string) => {
    await navigator.clipboard.writeText(v);
    setCopied(key);
    toast.success("تم النسخ");
    setTimeout(() => setCopied(null), 1500);
  };

  // Totals & derived amounts (no logic change — pure presentation)
  const paidSum = useMemo(
    () => (inv?.payments ?? []).filter((p: any) => p.status === "SUCCESS").reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0),
    [inv?.payments],
  );
  const remaining = Math.max(0, total - paidSum);
  const isPaid = inv?.status === "PAID";

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
        <div className="flex items-center gap-1.5 print:hidden">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />طباعة
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => downloadInvoicePDF(inv)}>
            <Download className="h-4 w-4" />تحميل PDF
          </Button>
        </div>
      )}
    >
      {/* Print-only CSS: hide chrome, show a clean A4 invoice card */}
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .invoice-doc { box-shadow: none !important; border-color: #d4d4d8 !important; break-inside: avoid; }
          .invoice-doc * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {q.isLoading || !inv ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* ============ FORMAL INVOICE DOCUMENT CARD ============ */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="invoice-doc relative overflow-hidden rounded-2xl border border-[#D8E1EC] bg-white shadow-sm"
              dir="rtl"
              style={{ fontFamily: "'Fira Sans','IBM Plex Sans Arabic','Segoe UI',sans-serif" }}
            >
              {/* Top corporate-blue rule */}
              <div className="h-1 bg-[#0E4C92]" />

              {/* Masthead — brand on right, oversized invoice № on left */}
              <div className="px-5 sm:px-8 pt-7 pb-4 grid grid-cols-[1fr_auto] items-end gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[#0E4C92] text-white font-black text-xl">ش</span>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-[#0A2540] truncate">شركة علي صالح الشهري القابضة</h2>
                      <p className="text-[10.5px] tracking-[0.28em] font-semibold text-[#0E4C92] mt-0.5" dir="ltr">ASH · HOLDING</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-sm bg-[#E6EEF7] px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0E4C92]" />
                    <span className="text-[10px] font-bold tracking-[0.22em] text-[#0E4C92]">فاتورة ضريبية · TAX INVOICE</span>
                  </div>
                </div>
                <div className="text-left shrink-0" dir="ltr">
                  <div className="text-[9.5px] tracking-[0.35em] font-bold text-[#5B6B7A] mb-0.5">INVOICE №</div>
                  <div
                    className="text-[#0A2540] leading-none"
                    style={{ fontFamily: "'DM Serif Display',Georgia,serif", fontSize: "clamp(28px,6vw,44px)", letterSpacing: "-0.5px" }}
                  >
                    {inv.invoiceNumber}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 justify-end">
                    <StatusBadge value={inv.status} />
                    {isPaid && (
                      <motion.span
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.2 }}
                        className="inline-grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"
                        aria-label="مدفوعة"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </motion.span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hairline */}
              <div className="mx-5 sm:mx-8 h-px bg-[#D8E1EC]" />

              {/* Meta grid — 4 columns each with blue accent tick */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 sm:px-8 py-5">
                {[
                  ["تاريخ الإصدار", formatDate(inv.issueDate || inv.createdAt)],
                  ["تاريخ الاستحقاق", formatDate(inv.dueAt)],
                  ["المرجع", inv.requestRef ?? inv.invoiceNumber],
                  ["العملة", `${inv.currency} · ريال سعودي`],
                ].map(([k, v]) => (
                  <div key={String(k)} className="border-r-2 border-[#0E4C92] pr-2.5" dir="rtl">
                    <div className="text-[9px] font-bold tracking-[0.2em] text-[#5B6B7A] mb-1">{k}</div>
                    <div className="text-[13px] font-bold text-[#0A2540] tabular-nums truncate">{v ?? "—"}</div>
                  </div>
                ))}
              </div>

              {/* Bill To / From cards */}
              <div className="mx-5 sm:mx-8 mb-4 grid grid-cols-1 sm:grid-cols-2 rounded border border-[#D8E1EC] overflow-hidden">
                <div className="p-4 sm:p-5 bg-[#E6EEF7] sm:border-l sm:border-[#D8E1EC]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-[3px] h-3 bg-[#0E4C92]" />
                    <span className="text-[9.5px] font-extrabold tracking-[0.24em] text-[#0E4C92]">فاتورة إلى · BILL TO</span>
                  </div>
                  <div className="text-[15px] font-extrabold text-[#0A2540]">{inv.client?.user?.name ?? inv.client?.company ?? "—"}</div>
                  {inv.client?.company && inv.client?.user?.name && (
                    <div className="text-[11.5px] text-[#5B6B7A] mt-0.5">{inv.client.company}</div>
                  )}
                  {inv.client?.user?.email && <div className="text-[11.5px] text-[#5B6B7A]" dir="ltr">{inv.client.user.email}</div>}
                  {inv.client?.user?.phone && <div className="text-[11.5px] text-[#5B6B7A]" dir="ltr">{inv.client.user.phone}</div>}
                </div>
                <div className="p-4 sm:p-5 bg-white">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-[3px] h-3 bg-[#0A2540]" />
                    <span className="text-[9.5px] font-extrabold tracking-[0.24em] text-[#0A2540]">من · FROM</span>
                  </div>
                  <div className="text-[15px] font-extrabold text-[#0A2540]">شركة علي صالح الشهري القابضة</div>
                  <div className="text-[11.5px] text-[#5B6B7A]">الرياض · المملكة العربية السعودية</div>
                  <div className="text-[11.5px] text-[#5B6B7A]">مرجع المشروع: <span dir="ltr" className="font-mono font-bold text-[#0A2540]">{inv.requestRef ?? "—"}</span></div>
                  <div className="text-[11.5px] text-[#5B6B7A] truncate">{inv.linkedRequest?.title ?? inv.project?.title ?? "—"}</div>
                </div>
              </div>

              {/* Deep-navy project banner */}
              <div className="mx-5 sm:mx-8 mb-4 rounded px-4 py-3 flex items-center justify-between gap-3 bg-[#0A2540] text-white">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[9.5px] tracking-[0.24em] font-bold text-[#E6EEF7] pe-3 border-e border-white/20">المشروع</span>
                  <span className="text-[13.5px] font-bold truncate">{inv.linkedRequest?.title ?? inv.project?.title ?? "خدمات مهنية"}</span>
                </div>
                {inv.linkedRequest?.proposalDuration ? (
                  <div className="text-[11px] text-[#E6EEF7] shrink-0"><span className="opacity-70">المدة:</span> <strong className="text-white">{inv.linkedRequest.proposalDuration} يوم</strong></div>
                ) : null}
              </div>


              {/* Items — desktop table + mobile card list */}
              <div className="p-5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/80 mb-3">البنود</div>

                {/* Desktop */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-right py-2.5 px-3 font-semibold">البند</th>
                        <th className="text-center py-2.5 px-3 font-semibold w-20">الكمية</th>
                        <th className="text-center py-2.5 px-3 font-semibold w-32">سعر الوحدة</th>
                        <th className="text-left py-2.5 px-3 font-semibold w-32">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inv.items ?? []).map((it: any, i: number) => (
                        <motion.tr
                          key={it.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + i * 0.04 }}
                          className="border-t border-border/50 hover:bg-primary/5 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-semibold">{it.title}</div>
                            {it.description && <div className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{it.description}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-center tabular-nums">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-center"><Money value={it.unitPrice} /></td>
                          <td className="py-2.5 px-3 text-left font-bold"><Money value={it.total} /></td>
                        </motion.tr>
                      ))}
                      {(!inv.items || inv.items.length === 0) && (
                        <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">لا توجد بنود</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: card per item */}
                <div className="sm:hidden space-y-2">
                  {(inv.items ?? []).map((it: any, i: number) => (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.04 }}
                      className="rounded-xl border border-border/60 bg-muted/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm">{it.title}</div>
                          {it.description && <div className="text-[11px] text-muted-foreground mt-0.5">{it.description}</div>}
                        </div>
                        <div className="font-black text-sm shrink-0"><Money value={it.total} /></div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>الكمية: <span className="text-foreground font-semibold tabular-nums">{it.quantity}</span></span>
                        <span>السعر: <Money value={it.unitPrice} /></span>
                      </div>
                    </motion.div>
                  ))}
                  {(!inv.items || inv.items.length === 0) && (
                    <p className="text-center py-6 text-muted-foreground text-xs">لا توجد بنود</p>
                  )}
                </div>

                {/* Totals panel */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
                  {/* Notes / terms */}
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground/80 mb-2">ملاحظات وشروط الدفع</div>
                    <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {inv.notes || "السداد خلال المدة المحددة أعلاه. جميع المبالغ بالريال السعودي (SAR) وتشمل ضريبة القيمة المضافة حسب النسبة الموضحة."}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <QrCode className="h-3.5 w-3.5" />
                      <span>يمكن التحقق من صحة الفاتورة عبر رمز QR بعد السداد من صفحة الإيصال</span>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="w-full sm:w-72 rounded-xl border border-border/70 overflow-hidden">
                    <TotalRow label="المبلغ الفرعي" value={<Money value={inv.subtotal} />} />
                    {Number(inv.discount ?? 0) > 0 && (
                      <TotalRow label="الخصم" value={<span className="text-rose-600">- <Money value={inv.discount ?? 0} /></span>} />
                    )}
                    <TotalRow label={`ضريبة القيمة المضافة (${Number(inv.taxRate ?? 15)}%)`} value={<Money value={inv.taxAmount} />} />
                    <div className="flex items-center justify-between gap-2 bg-primary text-primary-foreground px-4 py-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">الإجمالي النهائي</span>
                      <span className="font-black text-lg tabular-nums" dir="ltr">
                        {total.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                        <span className="text-[10px] opacity-80 ms-1">{inv.currency}</span>
                      </span>
                    </div>
                    {paidSum > 0 && (
                      <TotalRow label="المسدد" value={<span className="text-emerald-600">- {paidSum.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</span>} muted />
                    )}
                    {remaining > 0 && (
                      <div className="flex items-center justify-between gap-2 bg-amber-500/10 border-t border-amber-500/30 px-4 py-2.5">
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">المبلغ المتبقي</span>
                        <span className="font-black text-sm tabular-nums text-amber-700 dark:text-amber-400" dir="ltr">
                          {remaining.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} {inv.currency}
                        </span>
                      </div>
                    )}
                    {isPaid && (
                      <div className="flex items-center justify-center gap-1.5 bg-emerald-500/10 border-t border-emerald-500/30 px-4 py-2.5 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                        <BadgeCheck className="h-3.5 w-3.5" /> مسددة بالكامل
                      </div>
                    )}
                  </div>
                </div>

                {/* Signature / stamp footer */}
                <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-border/60">
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground/80 mb-6">توقيع المُصدِر</div>
                    <div className="mx-auto max-w-[180px] border-t border-border/70 pt-1 text-[10px] text-muted-foreground">ASH HOLDING</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground/80 mb-2">الختم</div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-primary/40 text-primary/60">
                      <Stamp className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>


            {/* INSTANT RECEIPT — shown right after wallet payment */}
            {receipt && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5"
              >
                <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                    <BadgeCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-base text-emerald-700 dark:text-emerald-400">تم سداد الفاتورة بنجاح</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">وصلك إشعار بنكي عبر واتساب · إيصالك الرسمي جاهز</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-background/70 border border-border p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">المبلغ المسدد</div>
                        <div className="font-black text-sm tabular-nums" dir="ltr">{Number(receipt.amount ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</div>
                        <div className="text-[9px] text-muted-foreground">ر.س</div>
                      </div>
                      <div className="rounded-lg bg-background/70 border border-border p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">كاش باك مضاف</div>
                        <div className="font-black text-sm text-amber-600 tabular-nums" dir="ltr">+{Number(receipt.cashback ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</div>
                        <div className="text-[9px] text-muted-foreground">ر.س</div>
                      </div>
                      <div className="rounded-lg bg-background/70 border border-border p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">رصيدك المتبقي</div>
                        <div className="font-black text-sm text-emerald-600 tabular-nums" dir="ltr">{receipt.balanceAfter != null ? Number(receipt.balanceAfter).toLocaleString("ar-SA", { minimumFractionDigits: 2 }) : "—"}</div>
                        <div className="text-[9px] text-muted-foreground">ر.س</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                        onClick={async () => {
                          const t = toast.loading("جاري تجهيز الإيصال…");
                          try { await downloadReceiptPDF(receipt); toast.success("تم تحميل الإيصال", { id: t }); }
                          catch { toast.error("تعذّر إنشاء الإيصال", { id: t }); }
                        }}
                      >
                        <Download className="h-4 w-4" />
                        تحميل إيصال السداد PDF
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setReceipt(null)}>إخفاء</Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PAYMENT FAILURE — clear alert with recovery actions */}
            <AnimatePresence>
              {payError && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-500/10 via-card to-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30">
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-sm text-rose-700 dark:text-rose-400">تعثّرت عملية الدفع</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{payError} — لم يتم خصم أي مبلغ من محفظتك.</p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <Button
                          size="sm" variant="outline" className="gap-1.5 border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
                          disabled={payWallet.isPending || submitTransfer.isPending}
                          onClick={() => (method === "wallet" ? payWallet.mutate() : submitTransfer.mutate())}
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", (payWallet.isPending || submitTransfer.isPending) && "animate-spin")} />
                          إعادة المحاولة
                        </Button>
                        {insufficientFunds && (
                          <Button
                            size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => navigate({ to: "/client/wallet" })}
                          >
                            <WalletIcon className="h-3.5 w-3.5" />
                            اشحن محفظتك الآن
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setPayError(null)}>
                          <X className="h-3.5 w-3.5" />
                          إخفاء
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* PERSISTENT RECEIPT — available anytime for paid invoices */}
            {inv.status === "PAID" && !receipt && (
              <DetailSection title="إيصال السداد" icon={Stamp}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <BadgeCheck className="h-3.5 w-3.5" /> مسددة بالكامل {inv.paidAt ? `· ${formatDate(inv.paidAt)}` : ""}
                    </span>
                    <span className="text-[11px] text-muted-foreground">الإيصال الرسمي المعتمد متاح دائماً هنا</span>
                  </div>
                  <Button
                    size="sm" variant="outline" className="gap-1.5"
                    onClick={async () => {
                      const t = toast.loading("جاري تجهيز الإيصال…");
                      try { await downloadReceiptPDF(buildReceipt(inv)); toast.success("تم تحميل الإيصال", { id: t }); }
                      catch { toast.error("تعذّر إنشاء الإيصال", { id: t }); }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    تحميل الإيصال
                  </Button>
                </div>
              </DetailSection>
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

            {/* WALLET LEDGER — every wallet movement tied to this invoice */}
            <DetailSection title="سجل عمليات المحفظة" icon={WalletIcon}>
              {(inv.walletTransactions ?? []).length ? (
                <div className="space-y-2">
                  {inv.walletTransactions.map((tx: any, i: number) => (
                    <WalletTxRow key={tx.id} tx={tx} index={i} />
                  ))}
                  <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2 text-[10px] text-muted-foreground text-center">
                    جميع حركات المحفظة المرتبطة بهذه الفاتورة موثّقة وتصلك إشعاراتها عبر واتساب
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  لا توجد عمليات محفظة مرتبطة بهذه الفاتورة بعد — ستظهر هنا فور السداد من المحفظة أو إضافة الكاش باك
                </p>
              )}
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

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground/80">{label}</div>
      <div className="mt-1 text-sm font-semibold truncate">{value ?? "—"}</div>
    </div>
  );
}

function TotalRow({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-2 px-4 py-2 text-xs border-b border-border/50 last:border-0", muted && "bg-muted/30")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums" dir="ltr">{value}</span>
    </div>
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

const TX_META: Record<string, { label: string; icon: any; tint: string }> = {
  PAYMENT:    { label: "سداد فاتورة",      icon: ArrowUpRight,   tint: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  WITHDRAW:   { label: "سحب رصيد",         icon: ArrowUpRight,   tint: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  TOPUP:      { label: "شحن رصيد",         icon: ArrowDownLeft,  tint: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  REFUND:     { label: "استرجاع",          icon: RotateCcw,      tint: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  CASHBACK:   { label: "كاش باك 1.85%",    icon: Sparkles,       tint: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  ADJUSTMENT: { label: "تعديل يدوي",       icon: Wrench,         tint: "bg-muted text-muted-foreground border-border" },
};

/** One wallet-ledger row tied to this invoice */
function WalletTxRow({ tx, index }: { tx: any; index: number }) {
  const meta = TX_META[tx.type] ?? TX_META.ADJUSTMENT;
  const Icon = meta.icon;
  const amt = Number(tx.amount ?? 0);
  const positive = amt >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 24 }}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors px-3 py-2.5"
    >
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border", meta.tint)}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">{meta.label}</span>
          <StatusBadge value={tx.status} />
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {tx.note || meta.label} · {formatDate(tx.createdAt)}
        </div>
      </div>
      <div className="text-left shrink-0">
        <div
          className={cn("font-black text-sm tabular-nums", positive ? "text-emerald-600" : "text-rose-600")}
          dir="ltr"
        >
          {positive ? "+" : ""}{amt.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
        </div>
        {tx.balanceAfter != null && (
          <div className="text-[9px] text-muted-foreground tabular-nums" dir="ltr">
            الرصيد: {Number(tx.balanceAfter).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
