import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Download, PlayCircle, Ban, Wallet } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { AmortizationTable } from "@/components/financing/AmortizationTable";
import { downloadFinancingContractPDF } from "@/lib/financing-contract-print";

export const Route = createFileRoute("/_authenticated/admin/financing/contracts/$id")({
  component: AdminContractDetail,
  head: () => ({ meta: [{ title: "عقد تمويل — إدارة ASH" }] }),
});

type Contract = {
  id: string; code: string; status: string;
  amount: number | string; downPayment: number | string; financedAmount: number | string;
  termMonths: number; ratePct: number | string;
  installmentAmount: number | string; totalInterest: number | string; totalPayable: number | string;
  firstDueDate?: string | null; lastDueDate?: string | null;
  clientSignedAt?: string | null; clientSignatureName?: string | null; clientSignatureHash?: string | null;
  activatedAt?: string | null; disbursedTxId?: string | null;
  application?: { id: string; code?: string; fullNameAr?: string | null; nationalId?: string | null; businessName?: string | null };
  product?: { nameAr?: string; code?: string };
  installments: Array<{
    n: number; dueDate: string; principal: number | string; interest: number | string;
    total: number | string; balanceAfter: number | string; status: string; paidAt?: string | null;
  }>;
};

const STATUS_AR: Record<string, string> = {
  DRAFT: "مسودة", AWAITING_CLIENT_SIGNATURE: "بانتظار توقيع العميل",
  SIGNED: "موقع — جاهز للتفعيل", ACTIVE: "نشط",
  COMPLETED: "منتهي", CANCELLED: "ملغى", DEFAULTED: "متعثر",
};

const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function AdminContractDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-fin-contract", id],
    queryFn: () => api.get<Contract>(`/financing/contracts/${id}`).then((r) => r.data),
    refetchInterval: 10000,
  });

  const activate = useMutation({
    mutationFn: () => api.post(`/financing/admin/contracts/${id}/activate`),
    onSuccess: () => {
      toast.success("✅ تم التفعيل وصرف الرصيد إلى محفظة العميل");
      qc.invalidateQueries({ queryKey: ["admin-fin-contract", id] });
    },
    onError: (e) => toast.error(apiError(e) || "فشل التفعيل"),
  });

  const [cancelReason, setCancelReason] = useState("");
  const cancel = useMutation({
    mutationFn: () => api.post(`/financing/admin/contracts/${id}/cancel`, { reasonAr: cancelReason.trim() }),
    onSuccess: () => { toast.success("تم إلغاء العقد"); qc.invalidateQueries({ queryKey: ["admin-fin-contract", id] }); },
    onError: (e) => toast.error(apiError(e) || "تعذر الإلغاء"),
  });

  const payInstallment = useMutation({
    mutationFn: (n: number) => api.post(`/financing/admin/contracts/${id}/installments/${n}/pay`, { source: "BANK" }),
    onSuccess: () => { toast.success("تم تسجيل السداد"); qc.invalidateQueries({ queryKey: ["admin-fin-contract", id] }); },
    onError: (e) => toast.error(apiError(e) || "فشل تسجيل السداد"),
  });

  if (isLoading || !data) return <div className="p-8 text-sm text-muted-foreground">جاري التحميل…</div>;

  const isSigned = data.status === "SIGNED";
  const isActive = data.status === "ACTIVE";
  const isFinal = ["COMPLETED", "CANCELLED"].includes(data.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`عقد ${data.code}`}
        description={`${data.product?.nameAr || ""} • ${data.application?.fullNameAr || data.application?.businessName || "—"} • الحالة: ${STATUS_AR[data.status] || data.status}`}
        icon={FileText}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadFinancingContractPDF(data)} className="gap-1">
              <Download className="h-4 w-4" /> تحميل PDF
            </Button>
            {isSigned && (
              <Button size="sm" onClick={() => activate.mutate()} disabled={activate.isPending} className="gap-1 bg-emerald-500 hover:bg-emerald-600">
                <PlayCircle className="h-4 w-4" /> تفعيل وصرف الرصيد
              </Button>
            )}
          </div>
        }
      />

      {isActive && data.disbursedTxId && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm flex items-center gap-3">
          <Wallet className="h-5 w-5 text-emerald-400" />
          <div>
            تم صرف <b>{money(data.financedAmount)} ر.س</b> رصيد خدمات إلى محفظة العميل بتاريخ {new Date(data.activatedAt!).toLocaleString("ar-SA")}.
          </div>
        </div>
      )}

      {/* Party info */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm space-y-1">
        <div><span className="text-muted-foreground">العميل: </span><b>{data.application?.fullNameAr || data.application?.businessName || "—"}</b></div>
        <div><span className="text-muted-foreground">الهوية/السجل: </span>{data.application?.nationalId || "—"}</div>
        <div><span className="text-muted-foreground">رقم الطلب: </span>
          <Link to="/admin/financing/$id" params={{ id: data.application!.id }} className="text-electric hover:underline">{data.application?.code}</Link>
        </div>
      </div>

      {/* Figures */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["إجمالي التمويل", `${money(data.amount)} ر.س`],
          ["المبلغ الممول", `${money(data.financedAmount)} ر.س`],
          ["القسط الشهري", `${money(data.installmentAmount)} ر.س`],
          ["المدة", `${data.termMonths} شهر`],
          ["نسبة الربح", `${Number(data.ratePct).toFixed(2)}%`],
          ["إجمالي الأرباح", `${money(data.totalInterest)} ر.س`],
          ["إجمالي المستحق", `${money(data.totalPayable)} ر.س`],
          ["الدفعة المقدمة", `${money(data.downPayment)} ر.س`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] text-muted-foreground">{k}</div>
            <div className="mt-1 font-bold tabular-nums text-sm">{v}</div>
          </div>
        ))}
      </div>

      {data.clientSignedAt && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs space-y-1">
          <div className="font-bold text-slate-200">توقيع العميل</div>
          <div>{data.clientSignatureName} — {new Date(data.clientSignedAt).toLocaleString("ar-SA")}</div>
          <div className="font-mono text-[10px] text-slate-500 break-all" dir="ltr">SHA-256: {data.clientSignatureHash}</div>
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold mb-2">جدول الأقساط</h3>
        <AmortizationTable
          rows={data.installments}
          canPay={isActive}
          onPay={(n) => payInstallment.mutate(n)}
        />
      </section>

      {!isFinal && !isActive && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
          <div className="text-sm font-semibold text-rose-300 flex items-center gap-2"><Ban className="h-4 w-4" /> إلغاء العقد</div>
          <input
            className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 text-sm"
            placeholder="سبب الإلغاء"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <Button size="sm" variant="destructive" disabled={cancelReason.trim().length < 3 || cancel.isPending} onClick={() => cancel.mutate()}>
            تأكيد الإلغاء
          </Button>
        </div>
      )}
    </div>
  );
}
