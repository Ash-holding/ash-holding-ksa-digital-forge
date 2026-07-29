import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Sparkles, Package, FileText, RefreshCw, ArrowLeft, Info, Zap, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { cn } from "@/lib/utils";
import { api, apiError } from "@/lib/api";

type SearchParams = { catalog?: string; item?: string };

export const Route = createFileRoute("/_authenticated/client/services/new")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    catalog: typeof s.catalog === "string" ? s.catalog : undefined,
    item: typeof s.item === "string" ? s.item : undefined,
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

const CATALOG_MAP: Record<string, { serviceType: string; title: string }> = {
  "dev/website": { serviceType: "WEBSITE", title: "موقع مؤسسي" },
  "dev/mobile": { serviceType: "MOBILE_APP", title: "تطبيق جوال iOS/Android" },
  "dev/store": { serviceType: "WEBSITE", title: "متجر إلكتروني" },
  "dev/api": { serviceType: "OTHER", title: "APIs مخصصة" },
  "systems/erp": { serviceType: "ADMIN_SYSTEM", title: "نظام ERP / CRM" },
  "systems/hosting": { serviceType: "HOSTING", title: "استضافة سحابية" },
  "systems/vps": { serviceType: "VPS", title: "سيرفر VPS / مخصص" },
  "systems/security": { serviceType: "OTHER", title: "حماية وجدران نارية" },
  "marketing/ads": { serviceType: "MARKETING", title: "إعلانات Google & Meta" },
  "marketing/seo": { serviceType: "MARKETING", title: "تحسين محركات البحث" },
  "marketing/growth": { serviceType: "MARKETING", title: "استراتيجية نمو" },
  "marketing/content": { serviceType: "MARKETING", title: "إدارة محتوى سوشيال" },
  "design/brand": { serviceType: "DESIGN", title: "هوية بصرية" },
  "design/uiux": { serviceType: "DESIGN", title: "تصميم UX/UI" },
  "design/motion": { serviceType: "DESIGN", title: "موشن جرافيك" },
  "design/creative": { serviceType: "DESIGN", title: "محتوى إبداعي" },
};

function NewServiceRequestPage() {
  const nav = useNavigate();
  const { catalog, item } = Route.useSearch();
  const preset = catalog && item ? CATALOG_MAP[`${catalog}/${item}`] : undefined;

  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>(
    catalog === "marketing" || catalog === "design" ? "QUOTE_REQUEST" : "NEW_SUBSCRIPTION"
  );
  const [title, setTitle] = useState(preset?.title ?? "");
  const [description, setDescription] = useState("");
  const [specDomain, setSpecDomain] = useState("");
  const [specDuration, setSpecDuration] = useState("YEARLY");
  const [basePrice, setBasePrice] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const specs: Record<string, unknown> = {};
      if (specDomain) specs.domain = specDomain;
      if (specDuration) specs.duration = specDuration;
      const body = {
        kind,
        catalogKey: catalog ?? "other",
        itemKey: item ?? "custom",
        serviceType: preset?.serviceType ?? "OTHER",
        title: title.trim(),
        description: description.trim() || undefined,
        specs: Object.keys(specs).length ? specs : undefined,
        basePrice: basePrice ? Number(basePrice) : undefined,
        billingCycle: kind === "NEW_SUBSCRIPTION" ? (specDuration as any) : "ONE_TIME",
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
        description={preset ? `أنت تطلب: ${preset.title}` : "اختر نوع الطلب واملأ التفاصيل"}
        actions={
          <Link to="/client/services" className="text-xs text-muted-foreground hover:text-electric inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> رجوع للكتالوج
          </Link>
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

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>عنوان الخدمة *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: استضافة سحابية 20GB" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>تفاصيل الطلب</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اذكر المواصفات، المدة، الاحتياجات الخاصة..." />
          </div>

          {kind === "NEW_SUBSCRIPTION" && (
            <>
              <div className="space-y-1.5">
                <Label>النطاق / اسم الحساب (اختياري)</Label>
                <Input value={specDomain} onChange={(e) => setSpecDomain(e.target.value)} placeholder="example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>دورة الفوترة</Label>
                <select value={specDuration} onChange={(e) => setSpecDuration(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                  <option value="MONTHLY">شهري</option>
                  <option value="QUARTERLY">ربع سنوي</option>
                  <option value="YEARLY">سنوي</option>
                  <option value="ONE_TIME">مرة واحدة</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>السعر المبدئي (اختياري)</Label>
                <Input type="number" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="سيتم تأكيده من الفريق" />
              </div>
            </>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-electric/5 border border-electric/20 p-3 text-[12px] text-muted-foreground">
          <Info className="h-4 w-4 text-electric mt-0.5 shrink-0" />
          {kind === "NEW_SUBSCRIPTION" && "سيتم تأكيد السعر النهائي وتفعيل الخدمة فور اكتمال الدفع."}
          {kind === "QUOTE_REQUEST" && "سيرسل لك فريقنا عرض سعر تفصيلي خلال 24 ساعة عمل."}
          {kind === "RENEWAL_UPGRADE" && "سنراجع خدمتك الحالية ونرسل لك خيارات التجديد أو الترقية."}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-electric" /> رد سريع</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> بدون رسوم إضافية</span>
          </div>
          <Button onClick={() => submit.mutate()} disabled={!canSubmit} className="bg-gradient-to-r from-electric to-purple-accent text-white font-bold">
            {submit.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
          </Button>
        </div>
      </motion.section>
    </div>
  );
}
