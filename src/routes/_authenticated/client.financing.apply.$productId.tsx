import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wallet, User as UserIcon, Briefcase, FileText, CheckCircle2,
  Upload, Trash2, ArrowRight, ArrowLeft, Shield,
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
    amount: s.amount ? Number(s.amount) : undefined,
    down: s.down ? Number(s.down) : undefined,
    term: s.term ? Number(s.term) : undefined,
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
  { key: "identity", label: "الهوية", icon: UserIcon },
  { key: "employment", label: "الدخل والعمل", icon: Briefcase },
  { key: "documents", label: "المستندات", icon: FileText },
  { key: "review", label: "المراجعة والإرسال", icon: CheckCircle2 },
];

function FinancingWizardPage() {
  const { productId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState<string | undefined>(search.id);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const created = useRef(false);

  // fetch product
  const productQ = useQuery({
    queryKey: ["financing-product", productId],
    queryFn: () => api.get<{ items: Product[] }>("/financing/products").then((r) => r.data.items.find((p) => p.id === productId)),
    retry: 1,
  });
  const product = productQ.data;

  // fetch or create application
  const appQ = useQuery({
    queryKey: ["financing-application", appId],
    queryFn: () => api.get<Application>(`/financing/applications/${appId}`).then((r) => r.data),
    enabled: !!appId,
  });
  const app = appQ.data;

  const createApp = async () => {
    if (!product) return;
    setCreating(true);
    setCreateErr(null);
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
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (created.current || appId || !product) return;
    created.current = true;
    void createApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, appId]);

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch<Application>(`/financing/applications/${appId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financing-application", appId] }),
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
  const canNext = useMemo(() => {
    if (!app) return false;
    if (step === 0) return !!(app.fullNameAr && app.nationalId && (isBusiness ? app.businessName && app.crNumber : true));
    if (step === 1) return !!(isBusiness ? app.annualRevenue : app.monthlyIncome != null);
    if (step === 2) return app.documents.length >= 1;
    if (step === 3) return !!(app.consentTerms && app.consentDataUse && app.consentCreditCheck);
    return true;
  }, [app, step, isBusiness]);

  if (productQ.isLoading) {
    return (
      <div className="space-y-6">
        <ClientPageHeader icon={Wallet} title="طلب تمويل جديد" description="جاري تحميل بيانات المنتج…" />
        <div className="rounded-2xl border border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">…</div>
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
              <p className="text-sm text-rose-300 mb-4">{createErr}</p>
              <Button onClick={() => { created.current = true; void createApp(); }} disabled={creating} className="bg-gradient-to-r from-electric to-purple-accent">
                {creating ? "جاري المحاولة…" : "إعادة المحاولة"}
              </Button>
              <div className="mt-3">
                <Link to="/client/financing" className="text-xs text-muted-foreground hover:text-electric">العودة</Link>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">…</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientPageHeader
        icon={Wallet}
        title={`طلب تمويل — ${product.nameAr}`}
        description={`رقم الطلب: ${app.code} • المبلغ: ${new Intl.NumberFormat("ar-SA").format(Number(app.amount))} ر.س • ${app.termMonths} شهر`}
      />

      {/* stepper */}
      <div className="rounded-2xl border border-border bg-card/50 p-3">
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs transition",
                i === step ? "bg-gradient-to-br from-electric/20 to-purple-accent/20 text-electric ring-1 ring-electric/30"
                  : i < step ? "text-emerald-400" : "text-muted-foreground hover:bg-white/5",
              )}
            >
              <s.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
        {step === 0 && (
          <IdentityStep app={app} isBusiness={isBusiness} onSave={(d) => save.mutate(d)} />
        )}
        {step === 1 && (
          <EmploymentStep app={app} isBusiness={isBusiness} onSave={(d) => save.mutate(d)} />
        )}
        {step === 2 && (
          <DocumentsStep app={app} product={product} onChanged={() => qc.invalidateQueries({ queryKey: ["financing-application", appId] })} />
        )}
        {step === 3 && (
          <ReviewStep app={app} onSave={(d) => save.mutate(d)} />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="gap-2">
          <ArrowRight className="h-4 w-4" /> السابق
        </Button>
        {step < 3 ? (
          <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="gap-2 bg-gradient-to-r from-electric to-purple-accent">
            التالي <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button disabled={!canNext || submit.isPending} onClick={() => submit.mutate()} className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500">
            <Shield className="h-4 w-4" /> {submit.isPending ? "جاري الإرسال…" : "تقديم الطلب"}
          </Button>
        )}
      </div>

      <div className="text-center">
        <Link to="/client/financing" className="text-xs text-muted-foreground hover:text-electric">العودة لقائمة طلباتي</Link>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
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
  return (
    <div className="grid gap-4 sm:grid-cols-2" onBlur={commit}>
      <Field label="الاسم الكامل (بالعربية)">
        <Input value={state.fullNameAr} onChange={(e) => setState({ ...state, fullNameAr: e.target.value })} />
      </Field>
      <Field label="رقم الهوية / الإقامة">
        <Input value={state.nationalId} onChange={(e) => setState({ ...state, nationalId: e.target.value })} inputMode="numeric" />
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
  return (
    <div className="grid gap-4 sm:grid-cols-2" onBlur={commit}>
      {!isBusiness && (
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
          <Field label="سنوات الخدمة"><Input type="number" min={0} value={state.yearsOfService} onChange={(e) => setState({ ...state, yearsOfService: Number(e.target.value) })} /></Field>
          <Field label="الدخل الشهري (ر.س)"><Input type="number" min={0} value={state.monthlyIncome} onChange={(e) => setState({ ...state, monthlyIncome: Number(e.target.value) })} /></Field>
          <Field label="الالتزامات الشهرية (ر.س)"><Input type="number" min={0} value={state.monthlyObligations} onChange={(e) => setState({ ...state, monthlyObligations: Number(e.target.value) })} /></Field>
        </>
      )}
      {isBusiness && (
        <Field label="الإيراد السنوي (ر.س)"><Input type="number" min={0} value={state.annualRevenue} onChange={(e) => setState({ ...state, annualRevenue: Number(e.target.value) })} /></Field>
      )}
      <div className="sm:col-span-2">
        <Field label="الغرض من التمويل"><Textarea rows={3} value={state.purposeAr} onChange={(e) => setState({ ...state, purposeAr: e.target.value })} /></Field>
      </div>
    </div>
  );
}

function DocumentsStep({ app, product, onChanged }: { app: Application; product: Product; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const required = product.requiredDocsAr?.length ? product.requiredDocsAr : ["صورة الهوية", "شهادة الراتب أو كشف بنكي"];
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingLabel, setPendingLabel] = useState<string>(required[0]);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("code", pendingLabel.slice(0, 40).replace(/\s+/g, "_"));
      fd.append("labelAr", pendingLabel);
      await api.post(`/financing/applications/${app.id}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("تم رفع المستند");
      onChanged();
    } catch (e) {
      toast.error((apiError(e) || "فشل الرفع"));
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/financing/applications/${app.id}/documents/${id}`);
      onChanged();
    } catch (e) { toast.error((apiError(e) || "تعذر الحذف")); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-500/5 p-3 text-xs text-muted-foreground ring-1 ring-slate-500/10">
        <strong className="text-foreground">المستندات المطلوبة:</strong> {required.join(" • ")}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={pendingLabel}
          onChange={(e) => setPendingLabel(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {required.map((r) => <option key={r} value={r}>{r}</option>)}
          <option value="مستند آخر">مستند آخر</option>
        </select>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button onClick={() => fileRef.current?.click()} disabled={busy} className="gap-2">
          <Upload className="h-4 w-4" /> {busy ? "جاري الرفع…" : "رفع مستند"}
        </Button>
      </div>

      <div className="space-y-2">
        {app.documents.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">لم يتم رفع أي مستند بعد.</div>}
        {app.documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <div className="min-w-0 flex items-center gap-2">
              <FileText className="h-4 w-4 text-electric" />
              <div className="min-w-0">
                <div className="text-sm truncate">{d.labelAr}</div>
                <div className="text-[10px] text-muted-foreground">{d.status}</div>
              </div>
            </div>
            <button onClick={() => remove(d.id)} className="text-rose-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewStep({ app, onSave }: { app: Application; onSave: (d: Record<string, unknown>) => void }) {
  const [state, setState] = useState({
    consentTerms: !!app.consentTerms,
    consentDataUse: !!app.consentDataUse,
    consentCreditCheck: !!app.consentCreditCheck,
  });
  const toggle = (k: keyof typeof state) => {
    const next = { ...state, [k]: !state[k] };
    setState(next);
    onSave(next);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-4 text-sm ring-1 ring-white/10 space-y-1">
        <div><span className="text-muted-foreground">المبلغ:</span> {new Intl.NumberFormat("ar-SA").format(Number(app.amount))} ر.س</div>
        <div><span className="text-muted-foreground">المدة:</span> {app.termMonths} شهر</div>
        <div><span className="text-muted-foreground">الدفعة المقدمة:</span> {new Intl.NumberFormat("ar-SA").format(Number(app.downPayment))} ر.س</div>
        <div><span className="text-muted-foreground">المستندات المرفوعة:</span> {app.documents.length}</div>
      </div>

      <div className="space-y-2">
        {[
          { k: "consentTerms" as const, label: "أقر بأن جميع المعلومات صحيحة، وأوافق على شروط برنامج تمويل خدمات ASH." },
          { k: "consentDataUse" as const, label: "أوافق على معالجة بياناتي لأغراض دراسة الطلب وفقاً لسياسة الخصوصية." },
          { k: "consentCreditCheck" as const, label: "أفوّض آش هولدنق بإجراء الفحوصات الائتمانية الداخلية اللازمة." },
        ].map((c) => (
          <label key={c.k} className={cn(
            "flex items-start gap-3 rounded-xl p-3 cursor-pointer transition ring-1",
            state[c.k] ? "bg-emerald-500/10 ring-emerald-500/30" : "bg-white/5 ring-white/10 hover:bg-white/10",
          )}>
            <input type="checkbox" checked={state[c.k]} onChange={() => toggle(c.k)} className="mt-1" />
            <span className="text-xs leading-6">{c.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
