import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Wallet, ArrowRight, X, FileText, Clock, CheckCircle2,
  Sparkles, ShieldCheck, Gauge, ExternalLink,
} from "lucide-react";
import { api, apiError, fileUrl } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/client/financing/$id")({
  component: ClientFinancingDetail,
  head: () => ({ meta: [{ title: "تفاصيل طلب التمويل — ASH" }] }),
});

type App = {
  id: string; code: string; status: string;
  productId: string;
  amount: number | string; downPayment: number | string; termMonths: number;
  computedScore?: number | null; rejectionReasonAr?: string | null;
  submittedAt?: string | null; createdAt: string;
  product: { id: string; nameAr: string; code: string };
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

// pipeline steps (index → status)
const PIPELINE: { key: string; label: string; match: string[] }[] = [
  { key: "submitted",  label: "التقديم",             match: ["SUBMITTED"] },
  { key: "kyc",        label: "تحقق الهوية",         match: ["KYC_REVIEW", "KYC_APPROVED", "KYC_REJECTED"] },
  { key: "credit",     label: "الدراسة الائتمانية",  match: ["CREDIT_REVIEW"] },
  { key: "risk",       label: "مراجعة المخاطر",      match: ["RISK_REVIEW"] },
  { key: "committee",  label: "اللجنة الائتمانية",   match: ["COMMITTEE_REVIEW"] },
  { key: "final",      label: "الاعتماد النهائي",    match: ["PENDING_FINAL", "APPROVED"] },
];
function stageIndex(status: string): number {
  const i = PIPELINE.findIndex((p) => p.match.includes(status));
  if (i >= 0) return i;
  if (status === "MORE_INFO") return 1;
  if (["REJECTED", "CANCELLED", "EXPIRED"].includes(status)) return -1;
  return 0;
}

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

  if (isLoading || !app) {
    return (
      <div className="space-y-4">
        <div className="h-14 animate-pulse rounded-2xl bg-card/40" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0,1,2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-card/40" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-card/40" />
      </div>
    );
  }

  const isDraft = app.status === "DRAFT";
  const isTerminal = ["APPROVED", "REJECTED", "CANCELLED", "EXPIRED"].includes(app.status);
  const currentStage = stageIndex(app.status);

  return (
    <div className="space-y-6">
      <ClientPageHeader
        icon={Wallet}
        title={`طلب تمويل — ${app.code}`}
        description={`${app.product.nameAr} • الحالة: ${STATUS_AR[app.status] || app.status}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {isDraft && app.product?.id && (
              <Link
                to="/client/financing/apply/$productId"
                params={{ productId: app.product.id }}
                search={{ id: app.id }}
              >
                <Button size="sm" className="gap-1 bg-gradient-to-r from-electric to-purple-accent">
                  <Sparkles className="h-4 w-4" /> إكمال المسودة
                </Button>
              </Link>
            )}
            {!isTerminal && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 text-rose-400 hover:text-rose-300">
                    <X className="h-4 w-4" /> إلغاء الطلب
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد إلغاء الطلب</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم إلغاء طلب التمويل <span className="font-mono">{app.code}</span>. لا يمكن التراجع عن هذه العملية.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>تراجع</AlertDialogCancel>
                    <AlertDialogAction onClick={() => cancel.mutate()} className="bg-rose-600 hover:bg-rose-500">
                      تأكيد الإلغاء
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      {/* Financial summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="المبلغ"          value={`${fmt(Number(app.amount))} ر.س`}       tone="from-electric to-cyan-500" />
        <Metric label="المدة"           value={`${app.termMonths} شهر`}                  tone="from-indigo-500 to-purple-500" />
        <Metric label="الدفعة المقدمة"  value={`${fmt(Number(app.downPayment))} ر.س`}  tone="from-emerald-500 to-teal-500" />
      </div>

      {/* Pipeline */}
      {!isTerminal && (
        <section className="rounded-2xl border border-border bg-card/50 p-5">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Gauge className="h-4 w-4" /> مسار المعالجة
          </div>
          <ol className="relative grid gap-4 md:grid-cols-6">
            {PIPELINE.map((p, i) => {
              const done = i < currentStage;
              const active = i === currentStage;
              return (
                <li key={p.key} className="relative">
                  <div className="flex items-center gap-3 md:flex-col md:items-start">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ring-2 transition ${
                      done ? "bg-emerald-500 text-white ring-emerald-500/40"
                      : active ? "bg-electric text-white ring-electric/40 animate-pulse"
                      : "bg-white/5 text-muted-foreground ring-white/10"
                    }`}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold ${active ? "text-electric" : done ? "text-emerald-300" : "text-muted-foreground"}`}>{p.label}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {app.rejectionReasonAr && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <div className="font-bold mb-1">سبب الرفض</div>
          {app.rejectionReasonAr}
        </div>
      )}

      {(app.status === "APPROVED" || app.contract) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-5"
        >
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-200">
                <CheckCircle2 className="h-4 w-4" /> تمت الموافقة النهائية على تمويلك
              </div>
              <div className="mt-1 text-xs text-amber-100/80">
                {app.contract
                  ? `العقد ${app.contract.code} — الحالة: ${CONTRACT_STATUS_AR[app.contract.status] || app.contract.status}`
                  : "لم يتم إصدار العقد بعد. سيتم إشعارك فور جاهزيته."}
              </div>
            </div>
            {app.contract && (
              <Link to="/client/financing/contracts/$id" params={{ id: app.contract.id }}>
                <Button size="sm" className="gap-1 bg-amber-500 text-slate-950 hover:bg-amber-400">
                  <FileText className="h-4 w-4" /> عرض العقد وتوقيعه
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      )}

      {app.computedScore != null && (
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> مؤشر أهلية أولي (تلقائي — ليس قرارًا نهائيًا)</span>
            <span className="font-mono text-electric">{app.computedScore}/100</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${app.computedScore}%` }} transition={{ duration: 0.8 }}
              className="h-full bg-gradient-to-r from-electric via-indigo-500 to-purple-accent"
            />
          </div>
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> المستندات</h3>
        <div className="rounded-2xl border border-border bg-card/50 divide-y divide-border overflow-hidden">
          {app.documents.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">لا يوجد مستندات مرفوعة.</div>}
          {app.documents.map((d) => (
            <div key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm truncate font-medium">{d.labelAr}</div>
                {d.notes && <div className="text-[11px] text-amber-400 mt-0.5">ملاحظة: {d.notes}</div>}
              </div>
              <div className="flex items-center gap-2">
                <StatusPill s={d.status} />
                <a href={fileUrl(d.filePath)} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-electric hover:bg-white/10 hover:text-cyan-300 transition">
                  <ExternalLink className="h-3 w-3" /> فتح
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> السجل الزمني</h3>
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <ol className="relative border-r-2 border-border/60 pr-5 space-y-4">
            {app.events.slice().reverse().map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -right-[26px] top-1.5 grid h-4 w-4 place-items-center rounded-full bg-slate-950 ring-2 ring-electric">
                  <span className="h-1.5 w-1.5 rounded-full bg-electric" />
                </span>
                <div className="text-sm text-foreground">{e.message ?? e.type}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(e.createdAt).toLocaleString("ar-SA")}
                  {e.toStatus ? ` • ${STATUS_AR[e.toStatus] || e.toStatus}` : ""}
                </div>
              </li>
            ))}
            {app.events.length === 0 && <li className="text-sm text-muted-foreground">لا توجد أحداث بعد.</li>}
          </ol>
        </div>
      </section>

      <div className="text-center pt-2">
        <Link to="/client/financing" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-electric">
          <ArrowRight className="h-3 w-3" /> جميع طلباتي
        </Link>
      </div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat("ar-SA").format(n); }
function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/50 p-4">
      <div aria-hidden className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-2xl`} />
      <div className="relative">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-black tabular-nums text-foreground">{value}</div>
      </div>
    </div>
  );
}
function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    APPROVED: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    REJECTED: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    UNDER_REVIEW: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    UPLOADED: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
    MISSING: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
    EXPIRED: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
  };
  const label: Record<string, string> = { APPROVED: "معتمد", REJECTED: "مرفوض", UNDER_REVIEW: "قيد المراجعة", UPLOADED: "مرفوع", MISSING: "ناقص", EXPIRED: "منتهٍ" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ring-1 ${map[s] || "bg-slate-500/15 ring-slate-500/30"}`}>{label[s] || s}</span>;
}
