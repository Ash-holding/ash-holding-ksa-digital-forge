import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSignature, PenLine, User, Calendar, Download, ShieldCheck, Lock } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { downloadContractPDF } from "@/lib/contract-print";

export const Route = createFileRoute("/_authenticated/client/contracts/$id")({
  component: ClientContractDetail,
});

function ClientContractDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["client-contract", id],
    queryFn: async () => (await api.get(`/contracts/${id}`)).data,
    refetchInterval: 8000, refetchOnWindowFocus: true,
  });
  const c = q.data?.contract;
  const linkedRequest = q.data?.linkedRequest ?? null;
  const paidInvoice = q.data?.paidInvoice ?? null;
  const isPaid = paidInvoice?.status === "PAID";
  const canDownload = isPaid && (c?.status === "SIGNED" || c?.status === "ACTIVE");

  const sign = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/request-sign`),
    onSuccess: () => { toast.success("تم إرسال طلب التوقيع"); qc.invalidateQueries({ queryKey: ["client-contract", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const handleDownload = async () => {
    if (!c) return;
    try { await downloadContractPDF(c, linkedRequest, paidInvoice); toast.success("تم تحميل العقد"); }
    catch { toast.error("تعذّر إنشاء ملف PDF"); }
  };

  return (
    <DetailShell
      backTo="/client/contracts"
      icon={FileSignature}
      loading={q.isLoading}
      title={c ? <span className="font-mono" dir="ltr">{c.contractNumber}</span> : "—"}
      subtitle={c?.title}
      status={c && <StatusBadge value={c.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
      actions={c && (
        canDownload ? (
          <Button size="sm" className="gap-1.5 bg-gradient-to-r from-electric to-plasma text-white" onClick={handleDownload}>
            <Download className="h-4 w-4" /> تحميل العقد الرسمي PDF
          </Button>
        ) : c.status !== "SIGNED" && c.status !== "ACTIVE" ? (
          <Button size="sm" className="gap-1.5" onClick={() => sign.mutate()}>
            <PenLine className="h-4 w-4" /> التوقيع الإلكتروني
          </Button>
        ) : null
      )}
    >
      {q.isLoading || !c ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* Gate banner */}
            {canDownload ? (
              <div className="rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground">العقد جاهز ومُوقَّع رقمياً</div>
                  <div className="text-xs text-muted-foreground">تم توثيق موافقتك وسداد الفاتورة {paidInvoice?.invoiceNumber ?? ""} — يمكنك تحميل النسخة الرسمية بصيغة PDF.</div>
                </div>
                <Button size="sm" className="gap-1.5" onClick={handleDownload}>
                  <Download className="h-4 w-4" /> تحميل
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground">العقد الرسمي قيد الإنشاء</div>
                  <div className="text-xs text-foreground/70 leading-relaxed mt-0.5">
                    يُنشأ العقد ويصبح متاحاً للقراءة والتحميل بصيغة PDF فور اكتمال: <strong>التوقيع الرقمي</strong> ثم <strong>سداد الفاتورة</strong>.
                    {paidInvoice?.status && paidInvoice.status !== "PAID" && <> — الفاتورة {paidInvoice.invoiceNumber} بانتظار السداد.</>}
                  </div>
                </div>
              </div>
            )}

            <DetailSection title="بيانات العقد" icon={FileSignature}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <KV k="القيمة" v={<Money value={c.value ?? 0} className="text-electric font-black text-base" />} />
                <KV k="تاريخ البدء" v={formatDate(c.startDate)} />
                <KV k="تاريخ الانتهاء" v={formatDate(c.endDate)} />
                <KV k="المدة" v={linkedRequest?.proposalDuration ? `${linkedRequest.proposalDuration} يوم` : "—"} />
                <KV k="المشروع" v={c.project?.title} />
                <KV k="أُنشئ في" v={formatDate(c.createdAt)} />
              </div>
            </DetailSection>

            <DetailSection title="بنود العقد">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {linkedRequest?.proposalScope || c.notes || "لا توجد تفاصيل إضافية"}
              </p>
            </DetailSection>

            {linkedRequest?.signatureHash && (
              <DetailSection title="التوقيع الرقمي" icon={ShieldCheck}>
                <div className="grid gap-2 text-xs">
                  <KV k="بصمة التوقيع" v={<span className="font-mono text-[10px] break-all" dir="ltr">{linkedRequest.signatureHash}</span>} />
                  <KV k="عنوان IP" v={<span className="font-mono" dir="ltr">{linkedRequest.signatureIp ?? "—"}</span>} />
                  <KV k="تاريخ التوقيع" v={formatDate(c.signedAt ?? linkedRequest.signedAt)} />
                </div>
              </DetailSection>
            )}
          </div>

          <div className="space-y-4">
            <DetailSection title="الأطراف" icon={User}>
              <KV k="الطرف الأول" v="ASH HOLDING" />
              <KV k="الطرف الثاني" v={c.client?.user?.name} />
            </DetailSection>
            <DetailSection title="الحالة" icon={Calendar}>
              <KV k="حالة العقد" v={<StatusBadge value={c.status} />} />
              <KV k="حالة الفاتورة" v={paidInvoice?.status ? <StatusBadge value={paidInvoice.status} /> : "—"} />
              <KV k="آخر تحديث" v={formatDate(c.updatedAt)} />
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}

