import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Package, FileText, RefreshCw, ArrowLeft, Info, Zap, ShieldCheck,
  Paperclip, X, CheckCircle2, Star, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { cn } from "@/lib/utils";
import { api, apiError } from "@/lib/api";
import { getCatalogItem, buildServiceDetails, formatPrice } from "@/lib/services-catalog";

type SearchParams = {
  catalog?: string;
  item?: string;
  plan?: string;
  price?: number;
  duration?: string;
};

export const Route = createFileRoute("/_authenticated/client/services/new")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    catalog: typeof s.catalog === "string" ? s.catalog : undefined,
    item: typeof s.item === "string" ? s.item : undefined,
    plan: typeof s.plan === "string" ? s.plan : undefined,
    price: typeof s.price === "number" ? s.price : typeof s.price === "string" ? Number(s.price) || undefined : undefined,
    duration: typeof s.duration === "string" ? s.duration : undefined,
  }),
  component: NewServiceRequestPage,
  head: () => ({
    meta: [
      { title: "طلب خدمة جديدة — بوابة العميل" },
      { name: "description", content: "قدّم طلب خدمة جديدة — اشتراك، تسعير، أو تجديد — وسيتواصل معك فريق آش هولدنق فوراً." },
      { property: "og:title", content: "طلب خدمة جديدة — ASH HOLDING" },
      { property: "og:description", content: "اشتراك جديد، طلب تسعير، أو تجديد — بواجهة مبسّطة وتفعيل سريع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const KINDS = [
  { key: "NEW_SUBSCRIPTION", label: "اشتراك جديد", hint: "استضافة/VPS/SMTP بسعر ثابت", icon: Package, tone: "from-emerald-500 to-teal-600" },
  { key: "QUOTE_REQUEST", label: "طلب تسعير", hint: "تسويق/تصميم/حلول مخصصة", icon: FileText, tone: "from-sky-500 to-indigo-600" },
  { key: "RENEWAL_UPGRADE", label: "تجديد / ترقية", hint: "خدمة قائمة تريد تجديدها", icon: RefreshCw, tone: "from-violet-500 to-fuchsia-600" },
] as const;

const DURATIONS = [
  { key: "MONTHLY", label: "شهري" },
  { key: "QUARTERLY", label: "ربع سنوي" },
  { key: "YEARLY", label: "سنوي" },
  { key: "ONE_TIME", label: "دفعة واحدة" },
] as const;

type UploadedFile = { name: string; url: string; size: number };

function NewServiceRequestPage() {
  const nav = useNavigate();
  const { catalog, item, plan: presetPlan, price: presetPrice, duration: presetDuration } = Route.useSearch();
  const found = catalog && item ? getCatalogItem(catalog, item) : null;
  const details = found ? buildServiceDetails(found.item, found.category) : null;
  const category = found?.category;
  const catalogItem = found?.item;

  const defaultKind: (typeof KINDS)[number]["key"] =
    catalog === "marketing" || catalog === "design" ? "QUOTE_REQUEST" : "NEW_SUBSCRIPTION";

  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>(defaultKind);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(
    presetPlan ?? details?.plans.find((p) => p.featured)?.name
  );
  const [duration, setDuration] = useState<string>(presetDuration ?? "YEARLY");
  const [title, setTitle] = useState(catalogItem?.title ?? "");
  const [description, setDescription] = useState("");
  const [specDomain, setSpecDomain] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const currentPlan = details?.plans.find((p) => p.name === selectedPlan);
  const effectivePrice = presetPrice ?? currentPlan?.price;
  const priceUnit = currentPlan?.unit ?? (duration === "MONTHLY" ? "ر.س / شهر" : "ر.س");

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const arr = Array.from(files).slice(0, 5);
      for (const f of arr) {
        if (f.size > 15 * 1024 * 1024) {
          toast.error(`الملف ${f.name} أكبر من 15MB`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/files/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const file = data.file;
        setAttachments((prev) => [...prev, { name: file.originalName, url: file.path, size: file.size }]);
      }
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = useMutation({
    mutationFn: async () => {
      const specs: Record<string, unknown> = {};
      if (specDomain) specs.domain = specDomain;
      if (duration) specs.duration = duration;
      if (selectedPlan) specs.plan = selectedPlan;
      const body = {
        kind,
        catalogKey: catalog ?? "other",
        itemKey: item ?? "custom",
        serviceType: "OTHER",
        title: title.trim(),
        description: description.trim() || undefined,
        specs,
        basePrice: effectivePrice,
        billingCycle: kind === "NEW_SUBSCRIPTION" ? duration : "ONE_TIME",
        attachments: attachments.length ? attachments.map((a) => ({ name: a.name, url: a.url })) : undefined,
      };
      const { data } = await api.post("/service-requests", body);
      return data;
    },
    onSuccess: (data) => {
      toast.success("تم تقديم الطلب بنجاح");
      nav({ to: "/client/services/requests/$id", params: { id: data.id } });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const canSubmit = title.trim().length >= 2 && !submit.isPending;

  return (
    <div className="space-y-6">
      <ClientPageHeader
        icon={Sparkles}
        title="طلب خدمة جديدة"
        description={catalogItem ? `أنت تطلب: ${catalogItem.title}` : "اختر نوع الطلب واملأ التفاصيل"}
        actions={
          catalog && item ? (
            <Link
              to="/client/services/catalog/$catKey/$itemKey"
              params={{ catKey: catalog, itemKey: item }}
              className="text-xs text-muted-foreground hover:text-electric inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> تفاصيل الخدمة
            </Link>
          ) : (
            <Link to="/client/services" className="text-xs text-muted-foreground hover:text-electric inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> رجوع للكتالوج
            </Link>
          )
        }
      />

      {/* Kind picker */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 sm:grid-cols-3">
        {KINDS.map((k) => {
          const active = kind === k.key;
          return (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-4 text-right transition",
                active ? "border-transparent ring-2 ring-electric shadow-lg shadow-electric/20 bg-card" : "border-border bg-card/60 hover:border-electric/50"
              )}
            >
              <div aria-hidden className={cn("absolute -top-10 -left-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition", k.tone, active && "opacity-40")} />
              <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow", k.tone)}>
                <k.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-black text-foreground">{k.label}</div>
              <div className="text-[11px] text-muted-foreground">{k.hint}</div>
            </button>
          );
        })}
      </motion.div>

      {/* Plan picker (only if details available) */}
      {details && category && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Star className={`h-4 w-4 ${category.accent}`} />
            <div className="text-sm font-black text-foreground">اختر الباقة</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {details.plans.map((p) => {
              const active = selectedPlan === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setSelectedPlan(p.name)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-4 text-right transition",
                    active
                      ? `border-transparent ring-2 ring-electric shadow-xl bg-gradient-to-br ${category.gradient} text-white`
                      : "border-border bg-card/60 text-foreground hover:border-electric/50"
                  )}
                >
                  {p.featured && !active && (
                    <span className="absolute left-3 top-3 rounded-full bg-electric/15 px-2 py-0.5 text-[10px] font-black text-electric">
                      الأكثر طلباً
                    </span>
                  )}
                  {active && (
                    <span className="absolute left-3 top-3">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </span>
                  )}
                  <div className={cn("text-[11px] font-bold uppercase tracking-widest", active ? "text-white/80" : "text-muted-foreground")}>
                    {p.name}
                  </div>
                  <div className={cn("mt-1 text-[12px]", active ? "text-white/90" : "text-muted-foreground")}>
                    {p.tagline}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black">{formatPrice(p.price)}</span>
                    <span className={cn("text-[11px]", active ? "text-white/80" : "text-muted-foreground")}>{p.unit}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Duration */}
          {kind === "NEW_SUBSCRIPTION" && (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <Label>مدة الاشتراك</Label>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                {DURATIONS.map((d) => {
                  const active = duration === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDuration(d.key)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-bold transition",
                        active
                          ? "border-transparent bg-electric text-white shadow"
                          : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.section>
      )}

      {/* Main form */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>عنوان الخدمة *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: استضافة سحابية 20GB" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>تفاصيل الطلب</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اذكر المواصفات، النطاق، الأهداف، أي مرجعية..." />
          </div>
          {kind === "NEW_SUBSCRIPTION" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>النطاق / اسم الحساب (اختياري)</Label>
              <Input value={specDomain} onChange={(e) => setSpecDomain(e.target.value)} placeholder="example.com" />
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" /> مرفقات (اختياري) — حتى 5 ملفات، 15MB لكل ملف
          </Label>
          <div
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
            }}
            className="rounded-xl border-2 border-dashed border-border bg-background/40 p-4 text-center transition hover:border-electric/60"
          >
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || attachments.length >= 5}
              className="inline-flex items-center gap-2 rounded-lg bg-electric/10 px-4 py-2 text-sm font-bold text-electric transition hover:bg-electric/20 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              {uploading ? "جاري الرفع..." : "اختر ملفات أو اسحبها هنا"}
            </button>
            <div className="mt-1 text-[11px] text-muted-foreground">PDF، صور، مستندات — كل ما يوضّح احتياجك</div>
          </div>
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5"
              >
                {attachments.map((a, i) => (
                  <motion.li
                    key={a.url}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-[12px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate text-foreground">{a.name}</span>
                      <span className="text-[10.5px] text-muted-foreground shrink-0">
                        {(a.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="إزالة"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-electric/5 border border-electric/20 p-3 text-[12px] text-muted-foreground">
          <Info className="h-4 w-4 text-electric mt-0.5 shrink-0" />
          {kind === "NEW_SUBSCRIPTION" && "سيتم تأكيد السعر النهائي وتفعيل الخدمة فور اكتمال الدفع."}
          {kind === "QUOTE_REQUEST" && "سيرسل لك فريقنا عرض سعر تفصيلي خلال 24 ساعة عمل."}
          {kind === "RENEWAL_UPGRADE" && "سنراجع خدمتك الحالية ونرسل لك خيارات التجديد أو الترقية."}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-electric" /> رد سريع</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> بدون رسوم إضافية</span>
            </div>
            {effectivePrice ? (
              <div className="text-[13px] font-black text-foreground">
                الإجمالي التقديري: <span className="text-electric">{formatPrice(effectivePrice)} {priceUnit}</span>
                {selectedPlan && <span className="mr-2 text-[11px] font-normal text-muted-foreground">({selectedPlan})</span>}
              </div>
            ) : null}
          </div>
          <Button onClick={() => submit.mutate()} disabled={!canSubmit} className="bg-gradient-to-r from-electric to-purple-accent text-white font-bold">
            {submit.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
          </Button>
        </div>
      </motion.section>
    </div>
  );
}
