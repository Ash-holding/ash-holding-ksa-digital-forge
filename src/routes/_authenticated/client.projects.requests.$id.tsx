import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight, Hash, Copy, ExternalLink, Sparkles, CheckCircle2, XCircle,
  MessageSquare, PenLine, Receipt, Clock, Wallet, Calendar, FileText,
  AlertTriangle, ShieldCheck, User as UserIcon,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/format";
import { ApprovalStepper } from "@/components/projects/ApprovalStepper";
import { CountdownTimer } from "@/components/projects/CountdownTimer";
import { SignatureDialog } from "@/components/projects/SignatureDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client/projects/requests/$id")({
  component: ClientRequestDetailPage,
  head: () => ({
    meta: [
      { title: "تفاصيل الطلب — بوابة العميل" },
      { name: "description", content: "تابع طلبك، راجع عرض السعر، وقّع رقمياً وابدأ التنفيذ." },
      { property: "og:title", content: "تفاصيل الطلب — بوابة العميل" },
      { property: "og:description", content: "تابع طلبك، راجع عرض السعر، وقّع رقمياً وابدأ التنفيذ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ClientRequestDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [showSig, setShowSig] = useState(false);
  const [revNote, setRevNote] = useState("");
  const [sendingRev, setSendingRev] = useState(false);

  const q = useQuery({
    queryKey: ["client-project-request", id],
    queryFn: async () => (await api.get(`/projects/requests/${id}`)).data,
    refetchInterval: 8000,
  });
  const r = q.data?.request;
  const ref: string = q.data?.ref || `REQ-${id.slice(0, 6).toUpperCase()}`;

  const revise = useMutation({
    mutationFn: (note: string) => api.post(`/projects/requests/${id}/revise`, { note }),
    onSuccess: () => {
      toast.success("تم إرسال طلب التعديل");
      setRevNote("");
      qc.invalidateQueries({ queryKey: ["client-project-request", id] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  async function sendRevision() {
    if (revNote.length < 5) return toast.error("اذكر التعديلات المطلوبة");
    setSendingRev(true);
    try { await revise.mutateAsync(revNote); } finally { setSendingRev(false); }
  }

  const copyRef = async () => { await navigator.clipboard.writeText(ref); toast.success("تم نسخ الرقم المرجعي"); };

  if (q.isLoading || !r) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-40 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-32 rounded-3xl bg-muted/30 animate-pulse" />
        <div className="h-40 rounded-3xl bg-muted/30 animate-pulse" />
        <div className="h-96 rounded-3xl bg-muted/30 animate-pulse" />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
        <div className="font-bold text-rose-200 mb-1">تعذّر تحميل الطلب</div>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/client/projects">عودة للمشاريع</Link>
        </Button>
      </div>
    );
  }

  const status = r.status as string;
  const hasProposal = !!r.proposalAmount;
  const canRevise = status === "PROPOSAL_SENT";
  const canSign = status === "AWAITING_SIGNATURE" && hasProposal;
  const executing = status === "IN_PROGRESS" && r.executionDueAt;
  const rejected = status === "REJECTED";

  return (
    <div className="space-y-4" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/client/projects" search={{ tab: "requests" } as never}>
            <ArrowRight className="h-4 w-4" /> عودة لطلباتي
          </Link>
        </Button>
        {r.project?.id && (
          <Button asChild size="sm" className="gap-1.5 bg-gradient-to-r from-electric to-purple-accent">
            <Link to="/client/projects/$id" params={{ id: r.project.id }}>
              فتح المشروع <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Cinematic Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-electric/25 bg-gradient-to-br from-card via-card to-electric/10 p-5 md:p-7"
      >
        <div className="pointer-events-none absolute -top-32 -end-32 h-80 w-80 rounded-full bg-gradient-to-br from-electric/25 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -start-32 h-80 w-80 rounded-full bg-gradient-to-br from-purple-accent/20 to-transparent blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <button onClick={copyRef} className="inline-flex items-center gap-1 rounded-full bg-background/70 backdrop-blur px-3 py-1.5 text-[11px] font-bold ring-1 ring-border hover:ring-electric/40 transition">
              <Hash className="h-3 w-3" /> {ref} <Copy className="h-3 w-3 opacity-60" />
            </button>
            <StatusBadge value={status} />
            <StatusBadge value={r.priority} />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-black tracking-tight mb-2"
          >
            {r.title}
          </motion.h1>
          <div className="text-[12px] text-muted-foreground flex items-center gap-2 flex-wrap">
            <Clock className="h-3.5 w-3.5" /> أُنشئ {formatDate(r.createdAt)}
            <span className="opacity-40">·</span>
            <UserIcon className="h-3.5 w-3.5" /> {r.contactName || r.client?.user?.name || "—"}
          </div>
        </div>
      </motion.div>

      <ApprovalStepper status={status as never} revisionCount={r.revisionCount ?? 0} />

      {executing && <CountdownTimer startAt={r.executionStartAt} dueAt={r.executionDueAt} />}

      {rejected && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-center text-rose-200">
          <XCircle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
          <div className="font-bold mb-1">تم رفض هذا الطلب</div>
          {r.adminNote && <div className="text-[12px] opacity-80 whitespace-pre-wrap">{r.adminNote}</div>}
        </div>
      )}

      {/* Proposal card */}
      {hasProposal && !rejected && (
        <motion.section
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={cn(
            "relative overflow-hidden rounded-3xl border p-5 md:p-6",
            status === "SIGNED" || status === "IN_PROGRESS" || status === "DELIVERED"
              ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5"
              : "border-electric/30 bg-gradient-to-br from-electric/10 via-card to-purple-accent/10",
          )}
        >
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">عرض رسمي من الفريق</div>
                <div className="font-black text-[15px]">عرض السعر والنطاق</div>
              </div>
            </div>
            {r.proposalValidUntil && (
              <span className="rounded-full bg-background/70 backdrop-blur px-3 py-1 text-[11px] font-bold ring-1 ring-border">
                صالح حتى {formatDate(r.proposalValidUntil)}
              </span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3 mb-4">
            <StatBlock icon={Wallet} label="القيمة الإجمالية" value={`${Number(r.proposalAmount).toLocaleString("ar-SA")} ر.س`} highlight />
            <StatBlock icon={Clock} label="المدة المقترحة" value={`${r.proposalDuration} يوم`} />
            <StatBlock icon={Calendar} label="تاريخ إرسال العرض" value={r.proposalSentAt ? formatDate(r.proposalSentAt) : "—"} />
          </div>

          {r.proposalScope && (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="text-[11px] text-muted-foreground mb-1.5 font-bold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-electric" /> نطاق العمل
              </div>
              <div className="text-[13px] whitespace-pre-wrap leading-relaxed">{r.proposalScope}</div>
            </div>
          )}

          {/* actions */}
          {canSign && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button onClick={() => setShowSig(true)}
                className="gap-2 flex-1 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-glow">
                <ShieldCheck className="h-4 w-4" /> توقيع رقمي معتمد الآن
              </Button>
            </div>
          )}
          {canRevise && (
            <div className="mt-4 space-y-2">
              <Textarea rows={3} value={revNote} onChange={(e) => setRevNote(e.target.value)}
                placeholder="اذكر التعديلات المطلوبة على العرض…" />
              <div className="flex gap-2">
                <Button variant="outline" className="gap-1.5" onClick={sendRevision} disabled={sendingRev || revNote.length < 5}>
                  <MessageSquare className="h-4 w-4" /> {sendingRev ? "جارٍ الإرسال…" : "طلب تعديل العرض"}
                </Button>
                <Button
                  className="gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 ms-auto"
                  onClick={() => api.post(`/projects/requests/${id}/request-signature`)
                    .then(() => { toast.success("تم إرسال رمز التوقيع لواتساب"); qc.invalidateQueries({ queryKey: ["client-project-request", id] }); })
                    .catch((e) => toast.error(apiError(e)))}
                >
                  <PenLine className="h-4 w-4" /> قبول والانتقال للتوقيع
                </Button>
              </div>
            </div>
          )}
          {status === "CLIENT_REVISION" && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-500">
              تم إرسال طلب التعديل — الفريق سيعود لك بعرض معدّل قريباً.
            </div>
          )}
          {r.signedAt && (
            <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-[12px]">
              <div className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> تم توثيق الموافقة رسمياً بتاريخ {formatDate(r.signedAt)}
              </div>
              <div className="text-emerald-200/80 text-[11px]" dir="ltr">
                Signature: <span className="font-mono">{r.signatureHash?.slice(0, 40)}…</span>
              </div>
            </div>
          )}
        </motion.section>
      )}

      {/* Original request summary */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-5 md:p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-electric/20 to-purple-accent/20">
            <Sparkles className="h-4 w-4 text-electric" />
          </div>
          <h3 className="font-black text-[14px]">تفاصيل طلبك</h3>
        </div>
        {r.description && (
          <div className="rounded-2xl bg-muted/30 p-4 text-[13px] leading-relaxed whitespace-pre-wrap mb-3">
            {r.description}
          </div>
        )}
        <div className="grid gap-2 md:grid-cols-3 text-[12px]">
          <InfoBox label="التصنيف" value={r.category} />
          <InfoBox label="الأولوية" value={r.priority} />
          <InfoBox label="التاريخ المستهدف" value={r.targetDate ? formatDate(r.targetDate) : "—"} />
          <InfoBox label="ميزانيتك التقديرية"
            value={(r.budgetMin || r.budgetMax) ? `${r.budgetMin ?? "—"} – ${r.budgetMax ?? "—"} ر.س` : "—"} />
          <InfoBox label="جوال التواصل" value={r.contactPhone || "—"} />
          <InfoBox label="اسم المسؤول" value={r.contactName || "—"} />
        </div>
      </motion.section>

      {/* Signature dialog */}
      {hasProposal && (
        <SignatureDialog
          open={showSig}
          onClose={() => setShowSig(false)}
          requestId={id}
          reference={ref}
          title={r.title}
          amount={Number(r.proposalAmount)}
          duration={r.proposalDuration}
          scope={r.proposalScope}
          onSigned={() => qc.invalidateQueries({ queryKey: ["client-project-request", id] })}
        />
      )}
    </div>
  );
}

function StatBlock({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border p-4",
      highlight ? "border-electric/40 bg-gradient-to-br from-electric/10 to-transparent" : "border-border/60 bg-background/60",
    )}>
      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={cn("font-black text-lg tabular-nums", highlight && "text-electric")}>{value}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-bold truncate">{value}</div>
    </div>
  );
}
