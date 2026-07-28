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

  // Digital signature — SHA-256 derived from real invoice data (changes if data changes)
  const [sig, setSig] = useState<{ hash: string; id: string; qr: string } | null>(null);
  useEffect(() => {
    if (!inv) return;
    let cancelled = false;
    (async () => {
      const hash = await computeInvoiceHash(inv);
      const id = signatureIdFromHash(hash, inv.invoiceNumber);
      const qr = await QRCode.toDataURL(`https://ash-holding.sa/verify?ref=${encodeURIComponent(inv.invoiceNumber ?? "")}&sig=${id}`, { margin: 0, width: 128, errorCorrectionLevel: "M" });
      if (!cancelled) setSig({ hash, id, qr });
    })();
    return () => { cancelled = true; };
  }, [inv?.invoiceNumber, inv?.total, inv?.status]);

  // Animated total counter
  const totalMV = useMotionValue(0);
  const totalRounded = useTransform(totalMV, (v) => v.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  useEffect(() => {
    const c = animateMV(totalMV, total, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [total]);

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
          @page { size: A4; margin: 10mm; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .invoice-doc { box-shadow: none !important; border-color: #DDE4F0 !important; break-inside: avoid; }
          .invoice-doc * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {q.isLoading || !inv ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* ============ MODERN LUXURY INVOICE DOCUMENT ============ */}
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="invoice-doc relative overflow-hidden rounded-2xl border border-[#DDE4F0] bg-white shadow-[0_10px_40px_-18px_rgba(11,30,58,0.18)]"
              dir="rtl"
              style={{ fontFamily: "'IBM Plex Sans Arabic','Noto Sans Arabic','Fira Sans','Segoe UI',sans-serif" }}
            >
              {/* Gradient brand rule */}
              <div className="h-1.5" style={{ background: "linear-gradient(90deg,#0B1E3A 0%,#1D4ED8 55%,#3B82F6 100%)" }} />

              {/* HEADER */}
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 sm:px-8 pt-6 pb-4 border-b border-[#DDE4F0]">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <motion.span
                      initial={{ scale: 0.85, rotate: -6, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 16 }}
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white font-black text-2xl shadow-[0_8px_20px_-6px_rgba(29,78,216,0.5)]"
                      style={{ background: "linear-gradient(135deg,#0B1E3A,#1D4ED8)" }}
                    >ش</motion.span>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-extrabold text-[#0B1E3A] truncate leading-tight">شركة علي صالح الشهري القابضة</h2>
                      <p className="text-[10.5px] text-[#5A6B85] mt-0.5">الرياض · المملكة العربية السعودية</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#5A6B85] leading-relaxed">
                    الرقم الضريبي: <span dir="ltr" className="text-[#0B1E3A] font-bold">300000000000003</span>
                    <span className="mx-2 text-[#DDE4F0]">|</span>
                    <span dir="ltr" className="text-[#0B1E3A] font-semibold">billing@ash-holding.sa</span>
                  </div>
                </div>
                <div className="text-left shrink-0 min-w-[180px]">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2FA] text-[#1D4ED8] text-[10px] font-extrabold tracking-[0.2em] mb-2">فاتورة ضريبية</span>
                  <div className="text-[10px] font-bold tracking-[0.18em] text-[#5A6B85] mb-1">رقم الفاتورة</div>
                  <button
                    type="button"
                    onClick={() => copy(inv.invoiceNumber, "invno")}
                    className="group inline-flex items-center gap-2 text-[#0B1E3A] hover:text-[#1D4ED8] transition-colors"
                    dir="ltr"
                    title="نسخ رقم الفاتورة"
                  >
                    <span className="text-[22px] font-extrabold leading-none tabular-nums tracking-tight">{inv.invoiceNumber}</span>
                    <motion.span
                      key={copied === "invno" ? "copied" : "copy"}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="opacity-60 group-hover:opacity-100"
                    >
                      {copied === "invno" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </motion.span>
                  </button>
                  <div className="mt-2 flex items-center gap-1.5 justify-end">
                    <StatusBadge value={inv.status} />
                    <AnimatePresence>
                      {isPaid && (
                        <motion.span
                          initial={{ scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
                          className="inline-grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white shadow-sm"
                          aria-label="مدفوعة"
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* META STRIP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 sm:px-8 py-4">
                {[
                  ["تاريخ الإصدار", formatDate(inv.issueDate || inv.createdAt), false],
                  ["تاريخ الاستحقاق", formatDate(inv.dueAt), false],
                  ["المرجع", inv.requestRef ?? inv.invoiceNumber, true],
                  ["العملة", `${inv.currency} · ريال سعودي`, false],
                ].map(([k, v, ltr], i) => (
                  <motion.div
                    key={String(k)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + i * 0.05 }}
                    className="rounded-xl bg-[#F7F9FD] border border-[#DDE4F0] px-3 py-2.5"
                  >
                    <div className="text-[9.5px] font-bold tracking-[0.16em] text-[#5A6B85] mb-1">{k}</div>
                    <div className={cn("text-[12.5px] font-bold text-[#0B1E3A] tabular-nums truncate", ltr && "text-right")} dir={ltr ? "ltr" : undefined}>
                      {v ?? "—"}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* BILL TO / PROJECT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-5 sm:px-8 pb-4">
                <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
                  className="rounded-xl border border-[#DDE4F0] p-4 bg-white">
                  <div className="text-[9.5px] font-extrabold tracking-[0.2em] text-[#1D4ED8] mb-2">فاتورة إلى</div>
                  <div className="text-[14px] font-extrabold text-[#0B1E3A]">{inv.client?.user?.name ?? inv.client?.company ?? "—"}</div>
                  {inv.client?.company && inv.client?.user?.name && (<div className="text-[11.5px] text-[#5A6B85] mt-0.5">{inv.client.company}</div>)}
                  {inv.client?.vatNumber && (
                    <div className="text-[11.5px] text-[#5A6B85] mt-0.5">الرقم الضريبي: <span dir="ltr" className="text-[#0B1E3A] font-bold">{inv.client.vatNumber}</span></div>
                  )}
                  {inv.client?.user?.email && <div className="text-[11.5px] text-[#5A6B85]" dir="ltr">{inv.client.user.email}</div>}
                  {inv.client?.user?.phone && <div className="text-[11.5px] text-[#5A6B85]" dir="ltr">{inv.client.user.phone}</div>}
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}
                  className="rounded-xl border border-[#DDE4F0] p-4"
                  style={{ background: "linear-gradient(135deg,#F7F9FD,#EEF2FA)" }}>
                  <div className="text-[9.5px] font-extrabold tracking-[0.2em] text-[#1D4ED8] mb-2">المشروع</div>
                  <div className="text-[14px] font-extrabold text-[#0B1E3A] leading-snug">{inv.linkedRequest?.title ?? inv.project?.title ?? "خدمات مهنية"}</div>
                  {inv.linkedRequest?.proposalDuration ? (
                    <div className="text-[11.5px] text-[#5A6B85] mt-1">المدة المقترحة: <strong className="text-[#0B1E3A]">{inv.linkedRequest.proposalDuration} يوم</strong></div>
                  ) : null}
                  {inv.requestRef && (
                    <div className="text-[11.5px] text-[#5A6B85] mt-0.5">مرجع الطلب: <span dir="ltr" className="text-[#0B1E3A] font-bold">{inv.requestRef}</span></div>
                  )}
                </motion.div>
              </div>

              {/* ITEMS */}
              <div className="px-5 sm:px-8 pb-4">
                {/* Desktop table */}
                <div className="hidden sm:block overflow-hidden rounded-xl border border-[#DDE4F0]">
                  <table className="w-full text-sm">
                    <thead style={{ background: "#0B1E3A" }} className="text-white text-[10.5px] tracking-wider">
                      <tr>
                        <th className="text-start py-2.5 px-3 font-extrabold w-10">#</th>
                        <th className="text-start py-2.5 px-3 font-extrabold">الوصف</th>
                        <th className="text-center py-2.5 px-3 font-extrabold w-20">الكمية</th>
                        <th className="text-end py-2.5 px-3 font-extrabold w-28">سعر الوحدة</th>
                        <th className="text-end py-2.5 px-3 font-extrabold w-32">الإجمالي (SAR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inv.items ?? []).map((it: any, i: number) => (
                        <motion.tr
                          key={it.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.28 + i * 0.04 }}
                          className={cn("border-t border-[#DDE4F0] hover:bg-[#EEF2FA]/60 transition-colors", i % 2 && "bg-[#F7F9FD]")}
                        >
                          <td className="py-2.5 px-3 text-[10.5px] text-[#8A99B4] align-top tabular-nums" dir="ltr">{String(i + 1).padStart(2, "0")}</td>
                          <td className="py-2.5 px-3 align-top">
                            <div className="font-bold text-[12.5px] text-[#0B1E3A]">{it.title}</div>
                            {it.description && it.description !== it.title && (
                              <div className="text-[11px] text-[#5A6B85] mt-0.5 whitespace-pre-wrap leading-relaxed">{it.description}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center tabular-nums text-[#0B1E3A]">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-end tabular-nums text-[#0B1E3A]" dir="ltr"><Money value={it.unitPrice} /></td>
                          <td className="py-2.5 px-3 text-end font-extrabold tabular-nums text-[#0B1E3A]" dir="ltr"><Money value={it.total} /></td>
                        </motion.tr>
                      ))}
                      {(!inv.items || inv.items.length === 0) && (
                        <tr><td colSpan={5} className="text-center py-6 text-[#8A99B4] text-xs">لا توجد بنود</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {(inv.items ?? []).map((it: any, i: number) => (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.04 }}
                      className="rounded-xl border border-[#DDE4F0] bg-[#F7F9FD] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[#0B1E3A]">{it.title}</div>
                          {it.description && <div className="text-[11px] text-[#5A6B85] mt-0.5">{it.description}</div>}
                        </div>
                        <div className="font-black text-sm shrink-0 text-[#0B1E3A]" dir="ltr"><Money value={it.total} /></div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[#5A6B85]">
                        <span>الكمية: <span className="text-[#0B1E3A] font-bold tabular-nums">{it.quantity}</span></span>
                        <span>السعر: <Money value={it.unitPrice} /></span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* AMOUNT IN WORDS + TOTALS */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_300px] gap-2.5 px-5 sm:px-8 pb-4">
                <div className="rounded-xl border border-[#DDE4F0] bg-[#F7F9FD] p-4 flex flex-col justify-center">
                  <div className="text-[9.5px] font-extrabold tracking-[0.2em] text-[#1D4ED8] mb-2">المبلغ كتابةً</div>
                  <div className="text-[12.5px] font-bold text-[#0B1E3A] leading-relaxed">
                    {(() => {
                      const w = Math.floor(total);
                      const h = Math.round((total - w) * 100);
                      return `${new Intl.NumberFormat("ar-SA").format(w)} ريال${h ? ` و${h} هللة` : ""} فقط لا غير`;
                    })()}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDE4F0] overflow-hidden bg-white">
                  <div className="flex items-center justify-between px-3 py-2 text-[11px] text-[#5A6B85] border-b border-[#DDE4F0]">
                    <span>المبلغ الخاضع للضريبة</span>
                    <span dir="ltr" className="tabular-nums font-bold text-[#0B1E3A]"><Money value={inv.subtotal} /></span>
                  </div>
                  {Number(inv.discount ?? 0) > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 text-[11px] text-[#5A6B85] border-b border-[#DDE4F0]">
                      <span>الخصم</span>
                      <span dir="ltr" className="tabular-nums font-bold text-rose-600">- <Money value={inv.discount ?? 0} /></span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-3 py-2 text-[11px] text-[#5A6B85] border-b border-[#DDE4F0]">
                    <span>ضريبة القيمة المضافة ({Number(inv.taxRate ?? 15)}%)</span>
                    <span dir="ltr" className="tabular-nums font-bold text-[#0B1E3A]"><Money value={inv.taxAmount} /></span>
                  </div>
                  <div className="px-4 py-3 text-white" style={{ background: "linear-gradient(135deg,#0B1E3A,#1D4ED8)" }}>
                    <div className="text-[9.5px] tracking-[0.18em] font-extrabold text-[#EEF2FA] mb-0.5">الإجمالي المستحق</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10.5px] text-[#EEF2FA] opacity-90" dir="ltr">{inv.currency}</span>
                      <motion.span dir="ltr" className="font-black text-[22px] tabular-nums tracking-tight">
                        {totalRounded}
                      </motion.span>
                    </div>
                  </div>
                  {paidSum > 0 && !isPaid && (
                    <div className="flex items-center justify-between bg-[#F7F9FD] border-t border-[#DDE4F0] px-3 py-2 text-[11px]">
                      <span className="text-emerald-700 font-bold">المسدد</span>
                      <span dir="ltr" className="tabular-nums font-bold text-emerald-700">{paidSum.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {remaining > 0 && (
                    <div className="flex items-center justify-between bg-amber-500/10 border-t border-amber-500/30 px-3 py-2 text-[11px]">
                      <span className="text-amber-700 font-extrabold">المتبقي</span>
                      <span dir="ltr" className="tabular-nums font-extrabold text-amber-700">{remaining.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} {inv.currency}</span>
                    </div>
                  )}
                  {isPaid && (
                    <div className="flex items-center justify-center gap-1.5 bg-emerald-500/10 border-t border-emerald-500/30 px-3 py-2 text-emerald-700 text-[11px] font-extrabold">
                      <BadgeCheck className="h-3.5 w-3.5" /> مسددة بالكامل
                    </div>
                  )}
                </div>
              </div>

              {/* DIGITAL SIGNATURE PANEL — real SHA-256 from live data */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mx-5 sm:mx-8 mb-4 rounded-xl border border-[#DDE4F0] overflow-hidden"
                style={{ background: "linear-gradient(135deg,#FFFFFF,#F7F9FD)" }}
              >
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4">
                  <motion.div
                    initial={{ scale: 0.6, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.55 }}
                    className="relative grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/12 border border-emerald-500/30"
                  >
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.85 }}
                      className="absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white"
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    </motion.span>
                  </motion.div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[12.5px] font-extrabold text-[#0B1E3A]">التوقيع الرقمي</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[9.5px] font-extrabold">
                        <BadgeCheck className="h-3 w-3" /> تم التحقق
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[#5A6B85] leading-relaxed">
                      موقّعة إلكترونياً بواسطة نظام <strong className="text-[#0B1E3A]">شركة آش القابضة</strong>
                      {inv.paidAt && <> · {new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "long", timeStyle: "short" }).format(new Date(inv.paidAt))}</>}
                    </div>
                    {sig && (
                      <div className="text-[9.5px] text-[#5A6B85] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5" dir="ltr">
                        <button onClick={() => copy(sig.id, "sig")} className="inline-flex items-center gap-1 hover:text-[#1D4ED8] transition-colors">
                          <span className="text-[#0B1E3A] font-bold font-mono">{sig.id}</span>
                          {copied === "sig" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-50" />}
                        </button>
                        <span className="text-[#DDE4F0]">|</span>
                        <span>SHA-256: <span className="font-mono text-[#0B1E3A]">{sig.hash.slice(0, 12)}…{sig.hash.slice(-6)}</span></span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    {sig ? (
                      <motion.img
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={sig.qr}
                        alt="Verify"
                        className="h-14 w-14 rounded-md border border-[#DDE4F0] bg-white p-1"
                      />
                    ) : (
                      <Skeleton className="h-14 w-14 rounded-md" />
                    )}
                    <a
                      href={`/verify?ref=${encodeURIComponent(inv.invoiceNumber ?? "")}`}
                      target="_blank" rel="noreferrer"
                      className="text-[9.5px] font-bold text-[#1D4ED8] hover:underline inline-flex items-center gap-1 print:hidden"
                    >
                      تحقّق <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* FOOTER */}
              <div className="px-5 sm:px-8 py-3 border-t border-[#DDE4F0] flex items-center justify-between gap-3 text-[10.5px] text-[#5A6B85]">
                <span>فاتورة ضريبية إلكترونية صادرة وفق نظام هيئة الزكاة والضريبة والجمارك.</span>
                <span dir="ltr" className="font-mono text-[#0B1E3A] font-bold">ash-holding.sa</span>
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
