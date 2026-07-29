import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, MessageCircle, DollarSign, CheckCircle2, XCircle, Activity } from "lucide-react";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/service-requests/$id")({
  component: AdminServiceRequestDetail,
});

const STATUS_OPTIONS = [
  "UNDER_REVIEW","QUOTED","AWAITING_PAYMENT","PAID","PROVISIONING","ACTIVE","REJECTED","CANCELLED",
];

function AdminServiceRequestDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-service-request", id],
    queryFn: async () => (await api.get(`/service-requests/${id}`)).data,
    refetchInterval: 12000,
  });

  const [quotedPrice, setQuotedPrice] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [internal, setInternal] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const setQuote = useMutation({
    mutationFn: async () => (await api.post(`/service-requests/${id}/quote`, {
      quotedPrice: Number(quotedPrice),
      adminNotes: adminNotes || undefined,
    })).data,
    onSuccess: () => { toast.success("تم إرسال عرض السعر"); setQuotedPrice(""); setAdminNotes(""); qc.invalidateQueries({ queryKey: ["admin-service-request", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const changeStatus = useMutation({
    mutationFn: async (newStatus: string) => (await api.patch(`/service-requests/${id}/status`, {
      status: newStatus,
      note: statusNote || undefined,
      rejectReason: newStatus === "REJECTED" ? rejectReason : undefined,
    })).data,
    onSuccess: () => { toast.success("تم تحديث الحالة"); setStatusNote(""); setRejectReason(""); qc.invalidateQueries({ queryKey: ["admin-service-request", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const sendMsg = useMutation({
    mutationFn: async () => (await api.post(`/service-requests/${id}/messages`, { content: msg, isInternal: internal })).data,
    onSuccess: () => { setMsg(""); qc.invalidateQueries({ queryKey: ["admin-service-request", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (q.isLoading) return <div className="p-10 text-center text-muted-foreground">جاري التحميل...</div>;
  if (!q.data) return <div className="p-10 text-center text-muted-foreground">الطلب غير موجود</div>;
  const r = q.data;

  return (
    <div className="space-y-5">
      <Link to="/admin/service-requests" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-electric">
        <ArrowLeft className="h-3.5 w-3.5" /> رجوع للسجل
      </Link>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-gradient-to-br from-slate-950 to-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-electric">{r.code}</div>
            <h1 className="mt-1 text-xl sm:text-2xl font-black text-white">{r.title}</h1>
            <div className="mt-1 text-xs text-slate-400">
              {r.client?.user?.name} • {r.client?.user?.email} • {r.client?.user?.phone ?? "—"}
            </div>
            {r.description && <p className="mt-3 max-w-2xl text-sm text-slate-300">{r.description}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge value={r.status} />
            {(r.quotedPrice || r.basePrice) && <Money value={r.quotedPrice ?? r.basePrice} className="text-lg font-black text-white" />}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* Quote */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold"><DollarSign className="h-4 w-4 text-emerald-400" /> إرسال / تحديث عرض السعر</div>
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <Input type="number" placeholder="السعر" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} />
              <Input placeholder="ملاحظات للعميل (اختياري)" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
              <Button onClick={() => setQuote.mutate()} disabled={!quotedPrice || setQuote.isPending} className="bg-emerald-600 text-white">
                {setQuote.isPending ? "..." : "إرسال العرض"}
              </Button>
            </div>
          </section>

          {/* Status control */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold"><Activity className="h-4 w-4 text-electric" /> تغيير الحالة</div>
            <Input placeholder="ملاحظة (اختياري)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => {
                  if (s === "REJECTED" && !rejectReason) { toast.warning("أدخل سبب الرفض"); return; }
                  changeStatus.mutate(s);
                }} className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-electric/10 hover:text-electric hover:border-electric/40 transition">
                  {statusLabel(s)}
                </button>
              ))}
            </div>
            <Textarea rows={2} placeholder="سبب الرفض (مطلوب عند الرفض)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </section>

          {/* Chat */}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="h-4 w-4 text-electric" /> المحادثة</div>
            <div className="max-h-[380px] overflow-y-auto space-y-2 rounded-xl bg-background/40 p-3">
              {(r.messages ?? []).map((m: any) => {
                const mine = m.authorId === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.isInternal ? "bg-amber-500/20 border border-amber-500/40" : mine ? "bg-electric text-white" : "bg-muted/50 text-foreground"}`}>
                      {m.isInternal && <div className="text-[9px] font-bold text-amber-300 mb-1">ملاحظة داخلية</div>}
                      <div>{m.content}</div>
                      <div className={`mt-1 text-[9px] opacity-70`}>{formatDate(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
              {(r.messages ?? []).length === 0 && <div className="text-center text-xs text-muted-foreground py-4">لا توجد رسائل</div>}
            </div>
            <div className="flex items-end gap-2">
              <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="اكتب رسالتك..." className="flex-1" />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] inline-flex items-center gap-1">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                  داخلية
                </label>
                <Button onClick={() => sendMsg.mutate()} disabled={!msg.trim() || sendMsg.isPending} className="bg-electric text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-xs">
            <Row label="النوع" value={kindLabel(r.kind)} />
            <Row label="التصنيف" value={r.serviceType} />
            <Row label="الكتالوج" value={`${r.catalogKey} / ${r.itemKey}`} />
            <Row label="السعر المبدئي" value={r.basePrice ? <Money value={r.basePrice} /> : "—"} />
            <Row label="السعر المُسعَّر" value={r.quotedPrice ? <Money value={r.quotedPrice} /> : "—"} />
            <Row label="دورة الفوترة" value={r.billingCycle} />
            <Row label="تاريخ التقديم" value={formatDate(r.submittedAt ?? r.createdAt)} />
            {r.quotedAt && <Row label="تاريخ التسعير" value={formatDate(r.quotedAt)} />}
            {r.activatedAt && <Row label="تاريخ التفعيل" value={formatDate(r.activatedAt)} />}
          </div>
          {r.linkedServiceId && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 inline ml-1" />
              مرتبط بخدمة نشطة: {r.linkedServiceId}
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-xs">
            <div className="font-bold text-sm mb-2">السجل الزمني</div>
            {(r.events ?? []).slice().reverse().map((e: any) => (
              <div key={e.id} className="flex items-start gap-2 border-r-2 border-electric/40 pr-2">
                <div>
                  <div className="font-semibold">{e.kind} {e.toStatus && `→ ${e.toStatus}`}</div>
                  <div className="text-[10px] text-muted-foreground">{formatDate(e.createdAt)}</div>
                </div>
              </div>
            ))}
            {(r.events ?? []).length === 0 && <div className="text-muted-foreground">لا توجد أحداث</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground truncate max-w-[60%] text-left">{value ?? "—"}</span>
    </div>
  );
}

function statusLabel(s: string) {
  return ({ UNDER_REVIEW:"مراجعة", QUOTED:"تسعير", AWAITING_PAYMENT:"انتظار دفع", PAID:"مدفوع", PROVISIONING:"تجهيز", ACTIVE:"تفعيل", REJECTED:"رفض", CANCELLED:"إلغاء" } as any)[s] ?? s;
}
function kindLabel(k: string) {
  return ({ NEW_SUBSCRIPTION:"اشتراك جديد", QUOTE_REQUEST:"طلب تسعير", RENEWAL_UPGRADE:"تجديد/ترقية" } as any)[k] ?? k;
}
