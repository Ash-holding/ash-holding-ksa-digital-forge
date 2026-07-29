import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Send, X, CheckCircle2, Clock } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/client/services/requests/$id")({
  component: ClientServiceRequestDetail,
});

const STAGES = ["SUBMITTED","UNDER_REVIEW","QUOTED","AWAITING_PAYMENT","PAID","PROVISIONING","ACTIVE"] as const;

function ClientServiceRequestDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");

  const q = useQuery({
    queryKey: ["service-request", id],
    queryFn: async () => (await api.get(`/service-requests/${id}`)).data,
    refetchInterval: 12000,
  });

  const sendMsg = useMutation({
    mutationFn: async () => (await api.post(`/service-requests/${id}/messages`, { content: msg })).data,
    onSuccess: () => { setMsg(""); qc.invalidateQueries({ queryKey: ["service-request", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const cancel = useMutation({
    mutationFn: async () => (await api.post(`/service-requests/${id}/cancel`)).data,
    onSuccess: () => { toast.success("تم إلغاء الطلب"); qc.invalidateQueries({ queryKey: ["service-request", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (q.isLoading) return <div className="p-10 text-center text-muted-foreground">جاري التحميل...</div>;
  if (!q.data) return <div className="p-10 text-center text-muted-foreground">الطلب غير موجود</div>;

  const r = q.data;
  const currentStageIdx = STAGES.indexOf(r.status as any);
  const isRejected = r.status === "REJECTED" || r.status === "CANCELLED";

  return (
    <div className="space-y-5">
      <Link to="/client/services/requests" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-electric">
        <ArrowLeft className="h-3.5 w-3.5" /> رجوع لسجل الطلبات
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-gradient-to-br from-slate-950 to-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-electric">{r.code}</div>
            <h1 className="mt-1 text-xl sm:text-2xl font-black text-white">{r.title}</h1>
            {r.description && <p className="mt-2 max-w-2xl text-sm text-slate-300">{r.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={r.status} />
            {(r.quotedPrice || r.basePrice) && <Money value={r.quotedPrice ?? r.basePrice} className="text-lg font-black text-white" />}
          </div>
        </div>

        {/* Pipeline */}
        {!isRejected && (
          <div className="mt-6 grid grid-cols-7 gap-1">
            {STAGES.map((s, i) => {
              const done = i <= currentStageIdx;
              const active = i === currentStageIdx;
              return (
                <div key={s} className="text-center">
                  <div className={`mx-auto h-2 rounded-full ${done ? "bg-gradient-to-r from-electric to-emerald-500" : "bg-white/10"} ${active ? "animate-pulse" : ""}`} />
                  <div className={`mt-1.5 text-[9px] ${done ? "text-white" : "text-slate-500"}`}>{stageLabel(s)}</div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Chat */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="h-4 w-4 text-electric" /> المحادثة</div>
          <div className="max-h-[420px] overflow-y-auto space-y-2 rounded-xl bg-background/40 p-3">
            {(r.messages ?? []).filter((m: any) => !m.isInternal).length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6">لا توجد رسائل بعد</div>
            )}
            {(r.messages ?? []).filter((m: any) => !m.isInternal).map((m: any) => {
              const mine = m.authorId === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-electric text-white" : "bg-muted/50 text-foreground"}`}>
                    <div>{m.content}</div>
                    <div className={`mt-1 text-[9px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>{formatDate(m.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-end gap-2">
            <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="اكتب رسالتك..." className="flex-1" />
            <Button onClick={() => sendMsg.mutate()} disabled={!msg.trim() || sendMsg.isPending} className="bg-electric text-white">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-xs">
            <Row label="النوع" value={kindLabel(r.kind)} />
            <Row label="التصنيف" value={r.serviceType} />
            <Row label="تاريخ التقديم" value={formatDate(r.submittedAt ?? r.createdAt)} />
            {r.quotedAt && <Row label="تاريخ التسعير" value={formatDate(r.quotedAt)} />}
            {r.paidAt && <Row label="تاريخ الدفع" value={formatDate(r.paidAt)} />}
            {r.activatedAt && <Row label="التفعيل" value={formatDate(r.activatedAt)} />}
            <Row label="دورة الفوترة" value={cycleLabel(r.billingCycle)} />
          </div>

          {r.linkedServiceId && (
            <Link to="/client/services/$id" params={{ id: r.linkedServiceId }} className="block rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center text-xs font-bold text-emerald-300 hover:bg-emerald-500/15">
              <CheckCircle2 className="mx-auto h-5 w-5 mb-1" />
              فتح الخدمة المُفعَّلة
            </Link>
          )}

          {!["ACTIVE","PAID","PROVISIONING","REJECTED","CANCELLED"].includes(r.status) && (
            <button onClick={() => cancel.mutate()} disabled={cancel.isPending} className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 inline-flex items-center justify-center gap-1">
              <X className="h-3.5 w-3.5" /> إلغاء الطلب
            </button>
          )}
          {r.rejectReason && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <div className="font-bold mb-1">سبب الرفض:</div>
              {r.rejectReason}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground truncate">{value ?? "—"}</span>
    </div>
  );
}

function stageLabel(s: string) {
  return ({ SUBMITTED:"مُقدَّم", UNDER_REVIEW:"مراجعة", QUOTED:"تسعير", AWAITING_PAYMENT:"دفع", PAID:"مدفوع", PROVISIONING:"تجهيز", ACTIVE:"مُفعَّل" } as any)[s] ?? s;
}
function kindLabel(k: string) {
  return ({ NEW_SUBSCRIPTION:"اشتراك جديد", QUOTE_REQUEST:"طلب تسعير", RENEWAL_UPGRADE:"تجديد/ترقية" } as any)[k] ?? k;
}
function cycleLabel(c: string) {
  return ({ ONE_TIME:"مرة واحدة", MONTHLY:"شهري", QUARTERLY:"ربع سنوي", YEARLY:"سنوي" } as any)[c] ?? c;
}
