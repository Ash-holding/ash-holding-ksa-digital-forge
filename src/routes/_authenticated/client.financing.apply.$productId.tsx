import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, User as UserIcon, Briefcase, FileText, CheckCircle2,
  Upload, Trash2, ArrowRight, ArrowLeft, Shield, AlertCircle,
  Loader2, CloudUpload, FileCheck2, ClipboardCheck,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client/financing/apply/$productId")({
  component: FinancingWizardPage,
  validateSearch: (s: Record<string, unknown>) => ({
    amount: s.amount !== undefined ? Number(s.amount) : undefined,
    down: s.down !== undefined ? Number(s.down) : undefined,
    term: s.term !== undefined ? Number(s.term) : undefined,
    id: s.id ? String(s.id) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "طلب تمويل جديد — ASH Financing" },
      { name: "description", content: "معالج تقديم طلب تمويل خدمات آش هولدنق برفع المستندات والموافقات القانونية." },
    ],
  }),
});

type Product = {
  id: string; nameAr: string; code: string; customerType: "INDIVIDUAL" | "BUSINESS";
  minAmount: number; maxAmount: number; minTermMonths: number; maxTermMonths: number;
  minDownPaymentPct: number; requiredDocsAr: string[];
};

type Application = {
  id: string; code: string; status: string;
  amount: number | string; downPayment: number | string; termMonths: number;
  fullNameAr?: string | null; nationalId?: string | null;
  employer?: string | null; jobTitle?: string | null; employmentType?: string | null;
  yearsOfService?: number | null; monthlyIncome?: number | string | null; monthlyObligations?: number | string | null;
  businessName?: string | null; crNumber?: string | null; vatNumber?: string | null;
  annualRevenue?: number | string | null; purposeAr?: string | null;
  consentTerms?: boolean; consentDataUse?: boolean; consentCreditCheck?: boolean;
  documents: { id: string; code: string; labelAr: string; filePath: string; status: string }[];
};

const STEPS = [
  { key: "identity",   label: "الهوية",             icon: UserIcon },
  { key: "employment", label: "الدخل والعمل",       icon: Briefcase },
  { key: "documents",  label: "المستندات",          icon: FileText },
  { key: "review",     label: "المراجعة والإرسال",  icon: ClipboardCheck },
];

/** Validate identity step and return list of missing/invalid Arabic field names. */
function validateIdentity(app: Application, isBusiness: boolean): string[] {
  const m: string[] = [];
  if (!app.fullNameAr?.trim()) m.push("الاسم الكامل");
  if (!app.nationalId?.trim()) m.push("رقم الهوية");
  else if (!/^\d{10}$/.test(app.nationalId.trim())) m.push("رقم هوية صحيح مكوّن من ١٠ أرقام");
  if (isBusiness) {
    if (!app.businessName?.trim()) m.push("اسم المنشأة");
    if (!app.crNumber?.trim()) m.push("رقم السجل التجاري");
  }
  return m;
}
function validateEmployment(app: Application, isBusiness: boolean): string[] {
  const m: string[] = [];
  if (isBusiness) {
    if (!app.annualRevenue || Number(app.annualRevenue) <= 0) m.push("الإيراد السنوي");
  } else {
    if (!app.monthlyIncome || Number(app.monthlyIncome) <= 0) m.push("الدخل الشهري");
    if (!app.employer?.trim()) m.push("جهة العمل");
  }
  return m;
}
function validateDocuments(app: Application): string[] {
  return (app.documents?.length ?? 0) === 0 ? ["مستند واحد على الأقل"] : [];
}
function validateReview(app: Application): string[] {
  const m: string[] = [];
  if (!app.consentTerms) m.push("الموافقة على الشروط");
  if (!app.consentDataUse) m.push("الموافقة على معالجة البيانات");
  if (!app.consentCreditCheck) m.push("تفويض الفحص الائتماني");
  return m;
}

function FinancingWizardPage() {
  const { productId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState<string | undefined>(search.id);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const created = useRef(false);

  const productQ = useQuery({
    queryKey: ["financing-product", productId],
    queryFn: () => api.get<{ items: Product[] }>("/financing/products").then((r) => r.data.items.find((p) => p.id === productId)),
    retry: 1,
  });
  const product = productQ.data;

  const appQ = useQuery({
    queryKey: ["financing-application", appId],
    queryFn: () => api.get<Application>(`/financing/applications/${appId}`).then((r) => r.data),
    enabled: !!appId,
  });
  const app = appQ.data;

  const createApp = async () => {
    if (!product) return;
    setCreating(true); setCreateErr(null);
    try {
      const amount = search.amount ?? product.minAmount;
      const term = search.term ?? product.minTermMonths;
      const down = search.down ?? Math.ceil((product.minDownPaymentPct / 100) * amount);
      const r = await api.post<Application>("/financing/applications", {
        productId: product.id, amount, downPayment: down, termMonths: term,
      });
      setAppId(r.data.id);
      navigate({
        to: "/client/financing/apply/$productId",
        params: { productId },
        search: { ...search, id: r.data.id },
        replace: true,
      });
    } catch (e) {
      setCreateErr(apiError(e) || "تعذر إنشاء الطلب");
    } finally { setCreating(false); }
  };

  useEffect(() => {
    if (created.current || appId || !product) return;
    created.current = true;
    void createApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, appId]);

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch<Application>(`/financing/applications/${appId}`, data),
    onSuccess: (r) => qc.setQueryData(["financing-application", appId], r.data),
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/financing/applications/${appId}/submit`),
    onSuccess: () => {
      toast.success("تم تقديم الطلب بنجاح");
      navigate({ to: "/client/financing/$id", params: { id: appId! } });
    },
    onError: (e: unknown) => {
      const anyE = e as { response?: { data?: { error?: string; missing?: string[] } } };
      const missing = anyE.response?.data?.missing;
      if (missing?.length) toast.error(`المطلوب: ${missing.join("، ")}`);
      else toast.error((apiError(e) || "تعذر تقديم الطلب"));
    },
  });

  const isBusiness = product?.customerType === "BUSINESS";

  const stepErrors = useMemo(() => {
    if (!app) return [];
    if (step === 0) return validateIdentity(app, !!isBusiness);
    if (step === 1) return validateEmployment(app, !!isBusiness);
    if (step === 2) return validateDocuments(app);
    if (step === 3) return validateReview(app);
    return [];
  }, [app, step, isBusiness]);

  const goNext = () => {
    if (stepErrors.length) { setErrors(stepErrors); return; }
    setErrors([]);
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goPrev = () => { setErrors([]); setStep((s) => Math.max(0, s - 1)); };

  if (productQ.isLoading) {
    return (
      <div className="space-y-6">
        <ClientPageHeader icon={Wallet} title="طلب تمويل جديد" description="جاري تحميل بيانات المنتج…" />
        <div className="h-32 animate-pulse rounded-2xl bg-card/40" />
      </div>
    );
  }
  if (productQ.isError || !product) {
    return (
      <div className="space-y-6">
        <ClientPageHeader icon={Wallet} title="طلب تمويل جديد" description="تعذر تحميل بيانات المنتج" />
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
          <p className="text-sm text-rose-300">المنتج غير متاح أو تم إيقافه.</p>
          <Link to="/client/financing" className="mt-3 inline-block text-xs text-electric underline">العودة لصفحة التمويل</Link>
        </div>
      </div>
    );
  }
  if (!app) {
    return (
      <div className="space-y-6">
        <ClientPageHeader icon={Wallet} title={`طلب تمويل — ${product.nameAr}`} description={creating ? "جاري إنشاء مسودة الطلب…" : (createErr ?? "جاري تجهيز المعالج…")} />
        <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
          {createErr ? (
            <>
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400" />
              <p className="text-sm text-rose-300 mb-4">{createErr}</p>
              <Button onClick={() => { created.current = true; void createApp(); }} disabled={creating} className="bg-gradient-to-r from-electric to-purple-accent">
                {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري المحاولة…</> : "إعادة المحاولة"}
              </Button>
              <div className="mt-3">
                <Link to="/client/financing" className="text-xs text-muted-foreground hover:text-electric">العودة</Link>
              </div>
            </>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> جاري تجهيز الطلب…
            </div>
          )}
        </div>
      </div>
    );
  }

  const completionPct = Math.round(((step + (stepErrors.length ? 0 : 1)) / STEPS.length) * 100);

  return (
    <div className="space-y-6">
      <ClientPageHeader
        icon={Wallet}
        title={`طلب تمويل — ${product.nameAr}`}
        description={`رقم الطلب: ${app.code} • ${new Intl.NumberFormat("ar-SA").format(Number(app.amount))} ر.س • ${app.termMonths} شهر`}
      />

      {/* Progress bar */}
      <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">الخطوة {step + 1} من {STEPS.length}</span>
          <span className="tabular-nums text-electric font-bold">{completionPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={false} animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.4 }}
            className="h-full rounded-full bg-gradient-to-r from-electric via-indigo-500 to-purple-accent"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <button
                key={s.key}
                onClick={() => setStep(i)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-semibold transition",
                  active && "bg-gradient-to-br from-electric/20 to-purple-accent/20 text-electric ring-1 ring-electric/40",
                  done && "text-emerald-400 hover:bg-white/5",
                  !active && !done && "text-muted-foreground hover:bg-white/5",
                )}
              >
                <div className={cn(
                  "grid h-7 w-7 place-items-center rounded-full ring-1",
                  active ? "bg-electric text-white ring-electric/40"
                  : done ? "bg-emerald-500 text-white ring-emerald-500/40"
                  : "bg-white/5 ring-white/10"
                )}>
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Errors banner */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-bold">يرجى استكمال الحقول التالية قبل المتابعة:</div>
                <ul className="mt-1 list-disc pr-4 text-xs">
                  {errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
        {step === 0 && <IdentityStep app={app} isBusiness={!!isBusiness} onSave={(d) => save.mutate(d)} />}
        {step === 1 && <EmploymentStep app={app} isBusiness={!!isBusiness} onSave={(d) => save.mutate(d)} />}
        {step === 2 && <DocumentsStep app={app} product={product} onChanged={() => qc.invalidateQueries({ queryKey: ["financing-application", appId] })} />}
        {step === 3 && <ReviewStep app={app} product={product} onSave={(d) => save.mutate(d)} />}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={step === 0} onClick={goPrev} className="gap-2">
          <ArrowRight className="h-4 w-4" /> السابق
        </Button>
        {step < 3 ? (
          <Button onClick={goNext} className="gap-2 bg-gradient-to-r from-electric to-purple-accent hover:opacity-90">
            حفظ ومتابعة <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            disabled={stepErrors.length > 0 || submit.isPending}
            onClick={() => submit.mutate()}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90"
          >
            {submit.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري الإرسال…</> : <><Shield className="h-4 w-4" /> تقديم الطلب</>}
          </Button>
        )}
      </div>

      <div className="text-center">
        <Link to="/client/financing" className="text-xs text-muted-foreground hover:text-electric">العودة لقائمة طلباتي</Link>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function IdentityStep({ app, isBusiness, onSave }: { app: Application; isBusiness: boolean; onSave: (d: Record<string, unknown>) => void }) {
  const [state, setState] = useState({
    fullNameAr: app.fullNameAr ?? "",
    nationalId: app.nationalId ?? "",
    businessName: app.businessName ?? "",
    crNumber: app.crNumber ?? "",
    vatNumber: app.vatNumber ?? "",
  });
  const commit = () => onSave(state);
  const idInvalid = state.nationalId && !/^\d{10}$/.test(state.nationalId);
  return (
    <div className="grid gap-4 sm:grid-cols-2" onBlur={commit}>
      <Field label="الاسم الكامل (بالعربية)">
        <Input value={state.fullNameAr} onChange={(e) => setState({ ...state, fullNameAr: e.target.value })} placeholder="مثال: محمد بن عبدالله السعيد" />
      </Field>
      <Field label="رقم الهوية / الإقامة" hint={idInvalid ? "يجب أن يكون ١٠ أرقام" : "١٠ أرقام"}>
        <Input
          value={state.nationalId}
          onChange={(e) => setState({ ...state, nationalId: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          inputMode="numeric" maxLength={10}
          className={idInvalid ? "border-rose-500/50" : ""}
        />
      </Field>
      {isBusiness && (
        <>
          <Field label="اسم المنشأة"><Input value={state.businessName} onChange={(e) => setState({ ...state, businessName: e.target.value })} /></Field>
          <Field label="رقم السجل التجاري"><Input value={state.crNumber} onChange={(e) => setState({ ...state, crNumber: e.target.value })} /></Field>
          <Field label="الرقم الضريبي (اختياري)"><Input value={state.vatNumber} onChange={(e) => setState({ ...state, vatNumber: e.target.value })} /></Field>
        </>
      )}
    </div>
  );
}

function EmploymentStep({ app, isBusiness, onSave }: { app: Application; isBusiness: boolean; onSave: (d: Record<string, unknown>) => void }) {
  const [state, setState] = useState({
    employer: app.employer ?? "",
    jobTitle: app.jobTitle ?? "",
    employmentType: (app.employmentType as string) ?? "PRIVATE",
    yearsOfService: app.yearsOfService ?? 0,
    monthlyIncome: app.monthlyIncome ? Number(app.monthlyIncome) : 0,
    monthlyObligations: app.monthlyObligations ? Number(app.monthlyObligations) : 0,
    annualRevenue: app.annualRevenue ? Number(app.annualRevenue) : 0,
    purposeAr: app.purposeAr ?? "",
  });
  const commit = () => onSave({
    ...state,
    yearsOfService: Number(state.yearsOfService),
    monthlyIncome: Number(state.monthlyIncome),
    monthlyObligations: Number(state.monthlyObligations),
    annualRevenue: Number(state.annualRevenue),
  });
  const dti = state.monthlyIncome > 0 ? Math.min(100, Math.round((state.monthlyObligations / state.monthlyIncome) * 100)) : 0;
  return (
    <div className="space-y-4" onBlur={commit}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!isBusiness ? (
          <>
            <Field label="جهة العمل"><Input value={state.employer} onChange={(e) => setState({ ...state, employer: e.target.value })} /></Field>
            <Field label="المسمى الوظيفي"><Input value={state.jobTitle} onChange={(e) => setState({ ...state, jobTitle: e.target.value })} /></Field>
            <Field label="نوع القطاع">
              <select value={state.employmentType}
                onChange={(e) => setState({ ...state, employmentType: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="GOV">حكومي</option>
                <option value="PRIVATE">خاص</option>
                <option value="SELF">أعمال حرة</option>
                <option value="RETIRED">متقاعد</option>
                <option value="OTHER">أخرى</option>
              </select>
            </Field>
            <Field label="سنوات الخدمة"><Input type="number" min={0} max={50} value={state.yearsOfService} onChange={(e) => setState({ ...state, yearsOfService: Number(e.target.value) })} /></Field>
            <Field label="الدخل الشهري (ر.س)"><Input type="number" min={0} value={state.monthlyIncome} onChange={(e) => setState({ ...state, monthlyIncome: Number(e.target.value) })} /></Field>
            <Field label="الالتزامات الشهرية (ر.س)" hint={state.monthlyIncome > 0 ? `نسبة الالتزام: ${dti}%` : undefined}>
              <Input type="number" min={0} value={state.monthlyObligations} onChange={(e) => setState({ ...state, monthlyObligations: Number(e.target.value) })} />
            </Field>
          </>
        ) : (
          <Field label="الإيراد السنوي (ر.س)"><Input type="number" min={0} value={state.annualRevenue} onChange={(e) => setState({ ...state, annualRevenue: Number(e.target.value) })} /></Field>
        )}
        <div className="sm:col-span-2">
          <Field label="الغرض من التمويل">
            <Textarea rows={3} value={state.purposeAr} onChange={(e) => setState({ ...state, purposeAr: e.target.value })} placeholder="وصف موجز للخدمة/المشروع الذي سيُموّل" />
          </Field>
        </div>
      </div>
      {!isBusiness && state.monthlyIncome > 0 && (
        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>نسبة الالتزامات إلى الدخل (DTI)</span>
            <span className={cn("font-bold tabular-nums", dti > 45 ? "text-rose-400" : dti > 33 ? "text-amber-300" : "text-emerald-300")}>{dti}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className={cn("h-full rounded-full",
              dti > 45 ? "bg-rose-500" : dti > 33 ? "bg-amber-500" : "bg-emerald-500"
            )} style={{ width: `${dti}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsStep({ app, product, onChanged }: { app: Application; product: Product; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const required = product.requiredDocsAr?.length ? product.requiredDocsAr : ["صورة الهوية", "شهادة الراتب أو كشف بنكي"];
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingLabel, setPendingLabel] = useState<string>(required[0]);

  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("حجم الملف يتجاوز ١٠ ميجابايت"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("code", pendingLabel.slice(0, 40).replace(/\s+/g, "_"));
      fd.append("labelAr", pendingLabel);
      await api.post(`/financing/applications/${app.id}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`تم رفع: ${pendingLabel}`);
      onChanged();
    } catch (e) { toast.error(apiError(e) || "فشل الرفع"); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const remove = async (id: string) => {
    try { await api.delete(`/financing/applications/${app.id}/documents/${id}`); onChanged(); }
    catch (e) { toast.error(apiError(e) || "تعذر الحذف"); }
  };

  const uploadedLabels = new Set((app.documents ?? []).map((d) => d.labelAr));
  const remaining = required.filter((r) => !uploadedLabels.has(r));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0]; if (f) void upload(f);
  };

  return (
    <div className="space-y-4">
      {/* Required checklist */}
      <div className="rounded-xl bg-slate-500/5 p-4 ring-1 ring-slate-500/10">
        <div className="mb-2 text-xs font-semibold text-foreground">المستندات المطلوبة</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {required.map((r) => {
            const done = uploadedLabels.has(r);
            return (
              <div key={r} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs ring-1",
                done ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" : "bg-white/5 text-muted-foreground ring-white/10"
              )}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                <span className="truncate">{r}</span>
              </div>
            );
          })}
        </div>
        {remaining.length > 0 && (
          <div className="mt-3 text-[11px] text-amber-300">
            متبقّي: {remaining.length} من {required.length}
          </div>
        )}
      </div>

      {/* Upload area */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select
          value={pendingLabel}
          onChange={(e) => setPendingLabel(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {required.map((r) => <option key={r} value={r}>{r}</option>)}
          <option value="مستند آخر">مستند آخر</option>
        </select>
        <Button onClick={() => fileRef.current?.click()} disabled={busy} className="gap-2 bg-gradient-to-r from-electric to-purple-accent">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "جاري الرفع…" : "اختر ملف"}
        </Button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition",
          dragging ? "border-electric bg-electric/5" : "border-border bg-white/5 hover:border-electric/50 hover:bg-electric/5",
        )}
      >
        <CloudUpload className={cn("h-10 w-10", dragging ? "text-electric" : "text-muted-foreground")} />
        <div className="text-sm font-bold text-foreground">اسحب الملف هنا أو انقر للاختيار</div>
        <div className="text-[11px] text-muted-foreground">صور أو PDF — حتى ١٠ ميجابايت</div>
        <div className="text-[11px] text-electric">سيُرفع كـ: <b>{pendingLabel}</b></div>
      </div>

      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />

      {/* Uploaded list */}
      <div className="space-y-2">
        {app.documents.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">لم يتم رفع أي مستند بعد.</div>
        ) : (
          app.documents.map((d) => (
            <motion.div
              key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10"
            >
              <FileCheck2 className="h-5 w-5 text-emerald-400" />
              <div className="min-w-0">
                <div className="text-sm truncate">{d.labelAr}</div>
                <div className="text-[10px] text-muted-foreground">{d.status}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">تم الرفع</span>
              <button onClick={() => remove(d.id)} className="text-rose-400 hover:text-rose-300 transition" aria-label="حذف">
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function ReviewStep({ app, product, onSave }: { app: Application; product: Product; onSave: (d: Record<string, unknown>) => void }) {
  const [state, setState] = useState({
    consentTerms: !!app.consentTerms,
    consentDataUse: !!app.consentDataUse,
    consentCreditCheck: !!app.consentCreditCheck,
  });
  const toggle = (k: keyof typeof state) => {
    const next = { ...state, [k]: !state[k] };
    setState(next); onSave(next);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-electric/20 bg-gradient-to-br from-electric/5 to-purple-accent/5 p-5">
        <div className="mb-3 text-sm font-bold text-foreground">ملخص الطلب</div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <SummaryRow label="المنتج" value={product.nameAr} />
          <SummaryRow label="الرقم" value={<span className="font-mono">{app.code}</span>} />
          <SummaryRow label="المبلغ" value={`${fmt(Number(app.amount))} ر.س`} />
          <SummaryRow label="المدة" value={`${app.termMonths} شهر`} />
          <SummaryRow label="الدفعة المقدمة" value={`${fmt(Number(app.downPayment))} ر.س`} />
          <SummaryRow label="المستندات المرفوعة" value={`${app.documents.length}`} />
        </div>
      </div>

      <div className="space-y-2">
        {[
          { k: "consentTerms" as const,       label: "أقر بأن جميع المعلومات صحيحة، وأوافق على شروط برنامج تمويل خدمات ASH." },
          { k: "consentDataUse" as const,     label: "أوافق على معالجة بياناتي لأغراض دراسة الطلب وفقاً لسياسة الخصوصية ولمتطلبات هيئة البيانات الوطنية." },
          { k: "consentCreditCheck" as const, label: "أفوّض آش هولدنق بإجراء الفحوصات الائتمانية الداخلية اللازمة." },
        ].map((c) => (
          <label key={c.k} className={cn(
            "flex items-start gap-3 rounded-xl p-3 cursor-pointer transition ring-1",
            state[c.k] ? "bg-emerald-500/10 ring-emerald-500/30" : "bg-white/5 ring-white/10 hover:bg-white/10",
          )}>
            <input type="checkbox" checked={state[c.k]} onChange={() => toggle(c.k)} className="mt-1 h-4 w-4 accent-emerald-500" />
            <span className="text-xs leading-6">{c.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground text-right truncate">{value}</span>
    </div>
  );
}
function fmt(n: number) { return new Intl.NumberFormat("ar-SA").format(n); }
