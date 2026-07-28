import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wallet, ArrowRight, CheckCircle2, XCircle, MessageSquareWarning,
  ChevronsRight, FileText, Clock, Shield, User as UserIcon,
} from "lucide-react";
import { api, apiError, fileUrl } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { InternalCreditReportPanel, type CreditReport } from "@/components/financing/InternalCreditReport";

export const Route = createFileRoute("/_authenticated/admin/financing/$id")({
  component: AdminFinancingDetail,
  head: () => ({ meta: [{ title: "مراجعة طلب تمويل — لوحة الإدارة" }] }),
});

type Doc = { id: string; code: string; labelAr: string; filePath: string; fileMime?: string | null; status: string; notes?: string | null };
type Event = { id: string; type: string; message?: string | null; createdAt: string; toStatus?: string | null; actorRole?: string | null };
type Decision = { id: string; stage: string; outcome: string; score?: number | null; notesAr?: string | null; createdAt: string; reviewerRole?: string | null };
type App = {
  id: string; code: string; status: string;
  amount: number | string; downPayment: number | string; termMonths: number;
  fullNameAr?: string | null; nationalId?: string | null;
  employer?: string | null; jobTitle?: string | null; employmentType?: string | null;
  monthlyIncome?: number | string | null; monthlyObligations?: number | string | null; yearsOfService?: number | null;
  businessName?: string | null; crNumber?: string | null; annualRevenue?: number | string | null;
  purposeAr?: string | null; computedScore?: number | null;
  submittedAt?: string | null; createdAt: string; rejectionReasonAr?: string | null;
  product: { nameAr: string; customerType: string; ratePct: number | string };
  applicant?: { id: string; name?: string | null; email?: string | null; phone?: string | null };
  documents: Doc[];
  events: Event[];
  decisions: Decision[];
};

const STAGE_FOR_STATUS: Record<string, string | undefined> = {
  SUBMITTED: "KYC", KYC_REVIEW: "KYC", KYC_APPROVED: "CREDIT",
  CREDIT_REVIEW: "CREDIT", RISK_REVIEW: "RISK",
  COMMITTEE_REVIEW: "COMMITTEE", PENDING_FINAL: "FINAL",
};

const STAGE_LABELS: Record<string, string> = {
  KYC: "التحقق من الهوية (Compliance)",
  CREDIT: "الدراسة الائتمانية (Credit)",
  RISK: "مراجعة المخاطر (Risk)",
  COMMITTEE: "اللجنة الائتمانية",
  FINAL: "الاعتماد النهائي",
};

const STATUS_AR: Record<string, string> = {
  DRAFT: "مسودة", SUBMITTED: "تم التقديم",
  KYC_REVIEW: "تحقق الهوية", KYC_APPROVED: "اعتماد الهوية", KYC_REJECTED: "رفض التحقق",
  CREDIT_REVIEW: "دراسة ائتمانية", RISK_REVIEW: "مراجعة المخاطر",
  COMMITTEE_REVIEW: "اللجنة الائتمانية", PENDING_FINAL: "اعتماد نهائي",
  MORE_INFO: "بحاجة لمعلومات", APPROVED: "معتمد", REJECTED: "مرفوض",
  CANCELLED: "ملغى", EXPIRED: "منتهي",
};

function AdminFinancingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: app, isLoading } = useQuery({
    queryKey: ["admin-financing-app", id],
    queryFn: () => api.get<App>(`/admin/financing/applications/${id}`).then((r) => r.data),
    refetchInterval: 10000,
  });

  const stage = useMemo(() => (app ? STAGE_FOR_STATUS[app.status] : undefined), [app]);
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState<number | "">("");
  const [rejReason, setRejReason] = useState("");

  const take = useMutation({
    mutationFn: () => api.post(`/admin/financing/applications/${id}/take`),
    onSuccess: () => { toast.success("تم تسلّم الطلب"); qc.invalidateQueries({ queryKey: ["admin-financing-app", id] }); },
    onError: (e) => toast.error((apiError(e) || "تعذر تسلّم الطلب")),
  });

  const decide = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post(`/admin/financing/applications/${id}/decisions`, { stage, ...payload }),
    onSuccess: () => {
      toast.success("تم تسجيل القرار");
      setNotes(""); setScore(""); setRejReason("");
      qc.invalidateQueries({ queryKey: ["admin-financing-app", id] });
    },
    onError: (e: unknown) => {
      const anyE = e as { response?: { data?: { error?: string; message?: string } } };
      toast.error(anyE.response?.data?.message || (apiError(e) || "تعذر تسجيل القرار"));
    },
  });

  const reviewDoc = useMutation({
    mutationFn: ({ docId, status, notes }: { docId: string; status: string; notes?: string }) =>
      api.patch(`/admin/financing/applications/${id}/documents/${docId}`, { status, notes }),
    onSuccess: () => { toast.success("تم تحديث المستند"); qc.invalidateQueries({ queryKey: ["admin-financing-app", id] }); },
  });

  const addNote = useMutation({
    mutationFn: (message: string) => api.post(`/admin/financing/applications/${id}/notes`, { message }),
    onSuccess: () => { toast.success("تمت إضافة الملاحظة"); qc.invalidateQueries({ queryKey: ["admin-financing-app", id] }); },
  });

  if (isLoading || !app) return <div className="p-8 text-sm text-muted-foreground">جاري التحميل…</div>;

  const canTake = app.status === "SUBMITTED" || app.status === "KYC_APPROVED";
  const showDecisionPanel = !!stage && !["APPROVED", "REJECTED", "CANCELLED", "EXPIRED", "MORE_INFO"].includes(app.status);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title={`طلب تمويل — ${app.code}`}
        description={`${app.product.nameAr} • الحالة: ${STATUS_AR[app.status] || app.status}`}
        actions={
          <Link to="/admin/financing"><Button variant="outline" size="sm" className="gap-1"><ArrowRight className="h-4 w-4" /> رجوع</Button></Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT — application info */}
        <div className="lg:col-span-2 space-y-4">
          <Section title="بيانات المتقدم" icon={UserIcon}>
            <Grid>
              <KV k="الاسم" v={app.fullNameAr} />
              <KV k="رقم الهوية" v={app.nationalId} />
              <KV k="الجوال" v={app.applicant?.phone} />
              <KV k="البريد" v={app.applicant?.email} />
              {app.product.customerType === "INDIVIDUAL" ? (
                <>
                  <KV k="جهة العمل" v={app.employer} />
                  <KV k="المسمى" v={app.jobTitle} />
                  <KV k="القطاع" v={app.employmentType} />
                  <KV k="سنوات الخدمة" v={app.yearsOfService} />
                  <KV k="الدخل الشهري" v={app.monthlyIncome ? `${fmt(Number(app.monthlyIncome))} ر.س` : null} />
                  <KV k="الالتزامات الشهرية" v={app.monthlyObligations ? `${fmt(Number(app.monthlyObligations))} ر.س` : null} />
                </>
              ) : (
                <>
                  <KV k="اسم المنشأة" v={app.businessName} />
                  <KV k="السجل التجاري" v={app.crNumber} />
                  <KV k="الإيراد السنوي" v={app.annualRevenue ? `${fmt(Number(app.annualRevenue))} ر.س` : null} />
                </>
              )}
            </Grid>
            {app.purposeAr && <div className="mt-3 text-xs text-muted-foreground">الغرض: {app.purposeAr}</div>}
          </Section>

          <Section title="ملخص التمويل" icon={Wallet}>
            <Grid>
              <KV k="المبلغ" v={`${fmt(Number(app.amount))} ر.س`} />
              <KV k="الدفعة المقدمة" v={`${fmt(Number(app.downPayment))} ر.س`} />
              <KV k="المدة" v={`${app.termMonths} شهر`} />
              <KV k="نسبة الإدارة" v={`${app.product.ratePct}%`} />
              <KV k="النقاط الأولية" v={app.computedScore != null ? `${app.computedScore}/100` : "—"} />
            </Grid>
          </Section>

          <Section title="المستندات" icon={FileText}>
            {app.documents.length === 0 ? (
              <div className="text-xs text-muted-foreground">لم يتم رفع مستندات.</div>
            ) : (
              <div className="space-y-2">
                {app.documents.map((d) => (
                  <div key={d.id} className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm truncate">{d.labelAr}</div>
                        <div className="text-[10px] text-muted-foreground">{d.status}{d.notes ? ` — ${d.notes}` : ""}</div>
                      </div>
                      <a href={fileUrl(d.filePath)} target="_blank" rel="noreferrer" className="text-xs text-electric hover:underline">فتح</a>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <button onClick={() => reviewDoc.mutate({ docId: d.id, status: "APPROVED" })}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20">اعتماد</button>
                      <button onClick={() => {
                        const n = window.prompt("سبب الرفض:"); if (n) reviewDoc.mutate({ docId: d.id, status: "REJECTED", notes: n });
                      }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 hover:bg-rose-500/20">رفض</button>
                      <button onClick={() => reviewDoc.mutate({ docId: d.id, status: "UNDER_REVIEW" })}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20">قيد المراجعة</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="السجل الزمني" icon={Clock}>
            <div className="space-y-2">
              {app.events.slice().reverse().map((e) => (
                <div key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 rounded-full bg-electric shrink-0" />
                  <div className="flex-1">
                    <div>{e.message ?? e.type}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString("ar-SA")}
                      {e.actorRole ? ` • ${e.actorRole}` : ""}
                      {e.toStatus ? ` • → ${STATUS_AR[e.toStatus] || e.toStatus}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* RIGHT — decision panel */}
        <aside className="space-y-4">
          {canTake && (
            <div className="rounded-2xl border border-border bg-card/50 p-4">
              <div className="text-xs text-muted-foreground mb-2">هذا الطلب لم يُتسلَّم بعد.</div>
              <Button onClick={() => take.mutate()} disabled={take.isPending} className="w-full gap-2">
                <ChevronsRight className="h-4 w-4" /> تسلّم الطلب للمراجعة
              </Button>
            </div>
          )}

          {showDecisionPanel && (
            <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Shield className="h-4 w-4 text-electric" />
                المرحلة الحالية: {STAGE_LABELS[stage!] || stage}
              </div>
              <div className="grid gap-2">
                <label className="text-[11px] text-muted-foreground">النقاط (اختياري)</label>
                <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value ? Number(e.target.value) : "")} />
                <label className="text-[11px] text-muted-foreground">ملاحظات</label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات المراجعة…" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => decide.mutate({ outcome: "APPROVE", score: score || undefined, notesAr: notes || undefined })}
                  disabled={decide.isPending}
                  className="gap-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                  <CheckCircle2 className="h-4 w-4" /> اعتماد
                </Button>
                <Button onClick={() => {
                  if (!rejReason.trim() && !notes.trim()) return toast.error("اكتب سبب الرفض");
                  decide.mutate({ outcome: "REJECT", notesAr: notes || undefined, rejectionReasonAr: rejReason || notes });
                }}
                  disabled={decide.isPending} variant="outline" className="gap-1 text-rose-400 border-rose-500/30">
                  <XCircle className="h-4 w-4" /> رفض
                </Button>
                <Button onClick={() => decide.mutate({ outcome: "REQUEST_INFO", notesAr: notes || undefined })}
                  disabled={decide.isPending} variant="outline" className="gap-1 col-span-2 text-amber-400 border-amber-500/30">
                  <MessageSquareWarning className="h-4 w-4" /> طلب معلومات إضافية
                </Button>
              </div>
              <Input placeholder="سبب الرفض المختصر (اختياري)" value={rejReason} onChange={(e) => setRejReason(e.target.value)} />

              <div className="border-t border-border pt-3">
                <Textarea rows={2} placeholder="ملاحظة داخلية (لا تُرسل للعميل)…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      const v = (e.target as HTMLTextAreaElement).value.trim();
                      if (v) { addNote.mutate(v); (e.target as HTMLTextAreaElement).value = ""; }
                    }
                  }} />
                <div className="text-[10px] text-muted-foreground mt-1">Ctrl+Enter لإضافة الملاحظة</div>
              </div>
            </div>
          )}

          {app.decisions.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/50 p-4">
              <div className="text-sm font-semibold mb-2">القرارات السابقة</div>
              <div className="space-y-2">
                {app.decisions.map((d) => (
                  <div key={d.id} className="text-xs rounded-lg bg-white/5 ring-1 ring-white/10 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{STAGE_LABELS[d.stage]}</span>
                      <span className={cn("px-2 py-0.5 rounded-full ring-1",
                        d.outcome === "APPROVE" ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" :
                        d.outcome === "REJECT" ? "bg-rose-500/10 text-rose-400 ring-rose-500/20" :
                        "bg-amber-500/10 text-amber-400 ring-amber-500/20")}>
                        {d.outcome}
                      </span>
                    </div>
                    {d.notesAr && <div className="mt-1 text-muted-foreground">{d.notesAr}</div>}
                    <div className="mt-1 text-[10px] text-muted-foreground">{new Date(d.createdAt).toLocaleString("ar-SA")} • {d.reviewerRole}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat("ar-SA").format(n); }
function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
        <Icon className="h-4 w-4 text-electric" />{title}
      </div>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function KV({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{k}</div>
      <div className="text-sm">{v == null || v === "" ? "—" : String(v)}</div>
    </div>
  );
}
