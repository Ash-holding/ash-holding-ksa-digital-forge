import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, ArrowRight, X, FileText, Clock, CheckCircle2 } from "lucide-react";
import { api, apiError, fileUrl } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/client/financing/$id")({
  component: ClientFinancingDetail,
  head: () => ({ meta: [{ title: "تفاصيل طلب التمويل — ASH" }] }),
});

type App = {
  id: string; code: string; status: string;
  amount: number | string; downPayment: number | string; termMonths: number;
  computedScore?: number | null; rejectionReasonAr?: string | null;
  submittedAt?: string | null; createdAt: string;
  product: { nameAr: string; code: string };
  documents: { id: string; labelAr: string; filePath: string; status: string; notes?: string | null }[];
  events: { id: string; type: string; message?: string | null; toStatus?: string | null; createdAt: string; actorRole?: string | null }[];
  decisions: { id: string; stage: string; outcome: string; notesAr?: string | null; createdAt: string }[];
  contract?: { id: string; code: string; status: string } | null;
};

const STATUS_AR: Record<string, string> = {
  DRAFT: "مسودة", SUBMITTED: "تم التقديم",
  KYC_REVIEW: "تحقق الهوية", KYC_APPROVED: "اعتماد الهوية", KYC_REJECTED: "رفض التحقق",
  CREDIT_REVIEW: "دراسة ائتمانية", RISK_REVIEW: "مراجعة المخاطر",
  COMMITTEE_REVIEW: "اللجنة الائتمانية", PENDING_FINAL: "اعتماد نهائي",
  MORE_INFO: "بحاجة لمعلومات إضافية", APPROVED: "معتمد", REJECTED: "مرفوض",
  CANCELLED: "ملغى", EXPIRED: "منتهي",
};

const CONTRACT_STATUS_AR: Record<string, string> = {
  DRAFT: "مسودة", AWAITING_CLIENT_SIGNATURE: "بانتظار توقيعك",
  SIGNED: "موقع — بانتظار التفعيل", ACTIVE: "نشط",
  COMPLETED: "منتهي", CANCELLED: "ملغى", DEFAULTED: "متعثر",
};

function ClientFinancingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: app, isLoading } = useQuery({
    queryKey: ["client-financing-app", id],
    queryFn: () => api.get<App>(`/financing/applications/${id}`).then((r) => r.data),
    refetchInterval: 10000,
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/financing/applications/${id}/cancel`),
    onSuccess: () => { toast.success("تم إلغاء الطلب"); qc.invalidateQueries({ queryKey: ["client-financing-app", id] }); },
    onError: (e) => toast.error((apiError(e) || "تعذر الإلغاء")),
  });

  if (isLoading || !app) return <div className="p-8 text-sm text-muted-foreground">جاري التحميل…</div>;

  const isDraft = app.status === "DRAFT";
  const isTerminal = ["APPROVED", "REJECTED", "CANCELLED", "EXPIRED"].includes(app.status);

  return (
    <div className="space-y-6">
      <ClientPageHeader
        icon={Wallet}
        title={`طلب تمويل — ${app.code}`}
        description={`${app.product.nameAr} • الحالة: ${STATUS_AR[app.status] || app.status}`}
        actions={
          <div className="flex gap-2">
            {isDraft && (
              <Link to="/client/financing/apply/$productId" params={{ productId: (app as unknown as { productId: string }).productId ?? "" }} search={{ id: app.id }}>
                <Button size="sm" variant="outline">إكمال المسودة</Button>
              </Link>
            )}
            {!isTerminal && (
              <Button size="sm" variant="outline" onClick={() => cancel.mutate()} className="gap-1 text-rose-400">
                <X className="h-4 w-4" /> إلغاء الطلب
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="المبلغ" value={`${fmt(Number(app.amount))} ر.س`} />
        <Metric label="المدة" value={`${app.termMonths} شهر`} />
        <Metric label="الدفعة المقدمة" value={`${fmt(Number(app.downPayment))} ر.س`} />
      </div>

      {app.rejectionReasonAr && (
        <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-300 ring-1 ring-rose-500/20">
          سبب الرفض: {app.rejectionReasonAr}
        </div>
      )}

      {(app.status === "APPROVED" || app.contract) && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-bold text-amber-300">🎉 تمت الموافقة النهائية على تمويلك</div>
              <div className="text-xs text-amber-200/80 mt-1">
                {app.contract
                  ? `العقد ${app.contract.code} — الحالة: ${CONTRACT_STATUS_AR[app.contract.status] || app.contract.status}`
                  : "لم يتم إصدار العقد بعد. سيتم إشعارك فور جاهزيته."}
              </div>
            </div>
            {app.contract && (
              <Link to="/client/financing/contracts/$id" params={{ id: app.contract.id }}>
                <Button size="sm" className="gap-1">
                  <FileText className="h-4 w-4" /> عرض العقد وتوقيعه
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {app.computedScore != null && (
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>مؤشر أهلية أولي (تلقائي — ليس قرارًا نهائيًا)</span>
            <span className="font-mono">{app.computedScore}/100</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-electric to-purple-accent" style={{ width: `${app.computedScore}%` }} />
          </div>
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> المستندات</h3>
        <div className="rounded-2xl border border-border bg-card/50 divide-y divide-border">
          {app.documents.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">لا يوجد مستندات.</div>}
          {app.documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="min-w-0">
                <div className="text-sm truncate">{d.labelAr}</div>
                {d.notes && <div className="text-[11px] text-amber-400">ملاحظة: {d.notes}</div>}
              </div>
              <div className="flex items-center gap-2">
                <StatusPill s={d.status} />
                <a href={fileUrl(d.filePath)} target="_blank" rel="noreferrer" className="text-xs text-electric hover:underline">فتح</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> السجل الزمني</h3>
        <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
          {app.events.slice().reverse().map((e) => (
            <div key={e.id} className="flex gap-3 text-sm">
              <span className="mt-1 h-2 w-2 rounded-full bg-electric shrink-0" />
              <div className="flex-1">
                <div className="text-foreground">{e.message ?? e.type}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleString("ar-SA")}{e.toStatus ? ` • ${STATUS_AR[e.toStatus] || e.toStatus}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center">
        <Link to="/client/financing" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-electric">
          <ArrowRight className="h-3 w-3" /> جميع طلباتي
        </Link>
      </div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat("ar-SA").format(n); }
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-bold tabular-nums">{value}</div>
    </div>
  );
}
function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    APPROVED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    REJECTED: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
    UNDER_REVIEW: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    UPLOADED: "bg-slate-500/10 text-slate-300 ring-slate-500/20",
  };
  const label: Record<string, string> = { APPROVED: "معتمد", REJECTED: "مرفوض", UNDER_REVIEW: "قيد المراجعة", UPLOADED: "مرفوع", MISSING: "ناقص", EXPIRED: "منتهٍ" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ring-1 ${map[s] || "bg-slate-500/10 ring-slate-500/20"}`}>{label[s] || s}</span>;
}
