import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FileText, Download, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AmortizationTable } from "@/components/financing/AmortizationTable";
import { downloadFinancingContractPDF } from "@/lib/financing-contract-print";

export const Route = createFileRoute("/_authenticated/client/financing/contracts/$id")({
  component: ClientContractDetail,
  head: () => ({ meta: [{ title: "عقد التمويل — ASH" }] }),
});

type Contract = {
  id: string; code: string; status: string;
  amount: number | string; downPayment: number | string; financedAmount: number | string;
  termMonths: number; ratePct: number | string; aprPct: number | string;
  installmentAmount: number | string; totalInterest: number | string;
  totalFees: number | string; totalPayable: number | string;
  firstDueDate?: string | null; lastDueDate?: string | null;
  clientSignedAt?: string | null; clientSignatureName?: string | null; clientSignatureHash?: string | null;
  activatedAt?: string | null;
  autopayEnabled?: boolean;
  application?: { code?: string; fullNameAr?: string | null; nationalId?: string | null; businessName?: string | null };
  product?: { nameAr?: string; code?: string };
  installments: Array<{
    n: number; dueDate: string; principal: number | string; interest: number | string;
    total: number | string; balanceAfter: number | string; status: string; paidAt?: string | null;
  }>;
};

const STATUS_AR: Record<string, string> = {
  DRAFT: "مسودة", AWAITING_CLIENT_SIGNATURE: "بانتظار توقيعك",
  SIGNED: "موقع — بانتظار التفعيل", ACTIVE: "نشط — تم صرف الرصيد",
  COMPLETED: "منتهي بالكامل", CANCELLED: "ملغى", DEFAULTED: "متعثر",
};

const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ClientContractDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["client-fin-contract", id],
    queryFn: () => api.get<Contract>(`/financing/contracts/${id}`).then((r) => r.data),
    refetchInterval: 15000,
  });

  const [name, setName] = useState("");
  const [t1, setT1] = useState(false);
  const [t2, setT2] = useState(false);
  const [t3, setT3] = useState(false);

  const sign = useMutation({
    mutationFn: () => api.post(`/financing/contracts/${id}/sign`, {
      fullName: name.trim(), acceptTerms: true, acceptSchedule: true, acceptDisclosure: true,
    }),
    onSuccess: () => {
      toast.success("✍️ تم توقيع العقد بنجاح — بانتظار التفعيل من إدارة التمويل");
      qc.invalidateQueries({ queryKey: ["client-fin-contract", id] });
    },
    onError: (e) => toast.error(apiError(e) || "تعذر توقيع العقد"),
  });

  const toggleAutopay = useMutation({
    mutationFn: (enabled: boolean) => api.patch(`/financing/contracts/${id}/autopay`, { enabled }),
    onSuccess: (_r, enabled) => {
      toast.success(enabled ? "✅ تم تفعيل السداد التلقائي" : "تم إيقاف السداد التلقائي");
      qc.invalidateQueries({ queryKey: ["client-fin-contract", id] });
    },
    onError: (e) => toast.error(apiError(e) || "تعذر تحديث السداد التلقائي"),
  });

  if (isLoading || !data) return <div className="p-8 text-sm text-muted-foreground">جاري التحميل…</div>;


  const canSign = data.status === "AWAITING_CLIENT_SIGNATURE";
  const canDownload = ["SIGNED", "ACTIVE", "COMPLETED"].includes(data.status);

  return (
    <div className="space-y-6">
      <ClientPageHeader
        icon={FileText}
        title={`عقد التمويل ${data.code}`}
        description={`${data.product?.nameAr || ""} • الحالة: ${STATUS_AR[data.status] || data.status}`}
        actions={
          canDownload && (
            <Button size="sm" variant="outline" onClick={() => downloadFinancingContractPDF(data)} className="gap-1">
              <Download className="h-4 w-4" /> تحميل PDF
            </Button>
          )
        }
      />

      {/* Status banner */}
      {data.status === "ACTIVE" && (
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-5 flex items-center gap-3"
        >
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <div>
            <div className="font-bold text-emerald-300">تم تفعيل العقد وصرف الرصيد ✨</div>
            <div className="text-xs text-emerald-200/80 mt-1">تحقق من محفظتك — رصيد الخدمات متاح للاستخدام على أي فاتورة.</div>
          </div>
          <Link to="/client/wallet" className="mr-auto">
            <Button size="sm" variant="outline">فتح المحفظة</Button>
          </Link>
        </motion.div>
      )}

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["إجمالي التمويل", `${money(data.amount)} ر.س`],
          ["المبلغ الممول", `${money(data.financedAmount)} ر.س`],
          ["القسط الشهري", `${money(data.installmentAmount)} ر.س`],
          ["المدة", `${data.termMonths} شهر`],
          ["نسبة الربح السنوي", `${Number(data.ratePct).toFixed(2)}%`],
          ["إجمالي الأرباح", `${money(data.totalInterest)} ر.س`],
          ["الرسوم الإدارية", `${money(data.totalFees)} ر.س`],
          ["إجمالي المستحق", `${money(data.totalPayable)} ر.س`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] text-muted-foreground">{k}</div>
            <div className="mt-1 font-bold tabular-nums text-sm">{v}</div>
          </div>
        ))}
      </div>

      {/* Signature panel */}
      {canSign && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldCheck className="h-5 w-5" /> توقيع إلكتروني رسمي
          </div>
          <div className="text-xs text-slate-300 leading-relaxed">
            بتوقيعك أدناه فإنك تُقر بالاطلاع على جميع بنود العقد وجدول الأقساط والالتزام بها. يتم تسجيل بصمة رقمية (SHA-256)
            مع الوقت وعنوان IP لضمان صحة التوقيع قانونياً.
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold">الاسم الكامل (كما هو في الهوية)</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد محمد الشهري" />
          </div>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={t1} onCheckedChange={(v) => setT1(v === true)} />
              <span>أُقر بأنني اطّلعت على شروط وأحكام العقد وأوافق عليها بالكامل.</span>
            </label>
            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={t2} onCheckedChange={(v) => setT2(v === true)} />
              <span>أوافق على جدول الأقساط ومواعيد الاستحقاق المذكورة.</span>
            </label>
            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={t3} onCheckedChange={(v) => setT3(v === true)} />
              <span>أعلم أن الرصيد المصروف عبارة عن رصيد خدمات داخلي غير قابل للسحب النقدي.</span>
            </label>
          </div>
          <Button
            className="w-full gap-2"
            disabled={!name.trim() || !t1 || !t2 || !t3 || sign.isPending}
            onClick={() => sign.mutate()}
          >
            <ShieldCheck className="h-4 w-4" />
            {sign.isPending ? "جارٍ التوقيع…" : "توقيع العقد إلكترونياً"}
          </Button>
        </div>
      )}

      {/* Signature display */}
      {data.clientSignedAt && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs space-y-1">
          <div className="font-bold text-emerald-300">✍️ توقيع رقمي مؤكد</div>
          <div>الموقع: <b>{data.clientSignatureName}</b></div>
          <div>التاريخ: {new Date(data.clientSignedAt).toLocaleString("ar-SA")}</div>
          <div className="font-mono text-[10px] text-slate-400 break-all" dir="ltr">
            SHA-256: {data.clientSignatureHash}
          </div>
        </div>
      )}

      {/* Amortization */}
      <section>
        <h3 className="text-sm font-semibold mb-2">جدول الأقساط</h3>
        <AmortizationTable rows={data.installments} />
      </section>

      <div className="text-center">
        <Link to="/client/financing" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-electric">
          <ArrowRight className="h-3 w-3" /> جميع طلباتي
        </Link>
      </div>
    </div>
  );
}
