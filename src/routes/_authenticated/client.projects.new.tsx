import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles, Rocket, Wallet, Calendar, Phone, User as UserIcon,
  Tag, Zap, ArrowRight, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { cn } from "@/lib/utils";
import { api, apiError } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/client/projects/new")({
  component: NewProjectRequestPage,
  head: () => ({
    meta: [
      { title: "طلب مشروع جديد — بوابة العميل" },
      { name: "description", content: "قدّم طلب مشروع جديد ويتواصل معك فريق آش هولدنق خلال 24 ساعة عمل." },
    ],
  }),
});

const CATEGORIES = [
  { key: "WEBSITE", label: "موقع إلكتروني", hint: "موقع تعريفي أو متجر" },
  { key: "MOBILE_APP", label: "تطبيق جوال", hint: "iOS / Android" },
  { key: "ADMIN_SYSTEM", label: "نظام إداري", hint: "لوحة تحكم / ERP" },
  { key: "MARKETING", label: "تسويق رقمي", hint: "حملات وسوشيال ميديا" },
  { key: "DESIGN", label: "تصميم / هوية", hint: "هوية بصرية / براندينج" },
  { key: "HOSTING", label: "استضافة / سيرفر", hint: "VPS / مخصص / SMTP" },
  { key: "SUPPORT", label: "دعم وصيانة", hint: "متابعة دورية" },
  { key: "OTHER", label: "طلب مخصص", hint: "اذكر التفاصيل" },
];

const PRIORITIES = [
  { key: "LOW", label: "منخفضة", cls: "bg-slate-500/10 text-slate-300 ring-slate-500/20" },
  { key: "NORMAL", label: "عادية", cls: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20" },
  { key: "HIGH", label: "عالية", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  { key: "URGENT", label: "عاجلة", cls: "bg-rose-500/10 text-rose-400 ring-rose-500/20" },
];

function NewProjectRequestPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [category, setCategory] = useState("WEBSITE");
  const [priority, setPriority] = useState("NORMAL");
  const [loading, setLoading] = useState(false);

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/projects/requests", data),
    onSuccess: () => {
      toast.success("تم إرسال الطلب — سيتم مراجعته قريباً");
      qc.invalidateQueries({ queryKey: ["project-requests"] });
      qc.invalidateQueries({ queryKey: ["client-project-requests"] });
      navigate({ to: "/client/projects", search: { tab: "requests" } as never });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const raw = Object.fromEntries(fd.entries());
      await create.mutateAsync({
        title: String(raw.title || ""),
        description: raw.description ? String(raw.description) : null,
        category,
        priority,
        budgetMin: raw.budgetMin ? Number(raw.budgetMin) : null,
        budgetMax: raw.budgetMax ? Number(raw.budgetMax) : null,
        targetDate: raw.targetDate ? String(raw.targetDate) : null,
        contactName: raw.contactName ? String(raw.contactName) : null,
        contactPhone: raw.contactPhone ? String(raw.contactPhone) : null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <ClientPageHeader
        icon={Rocket}
        title="طلب مشروع جديد"
        description="املأ التفاصيل بدقة لنقدم لك تقديراً زمنياً ومالياً أدق — يتواصل فريقنا معك خلال 24 ساعة عمل."
        actions={
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <Link to="/client/projects">
              <ArrowRight className="h-3.5 w-3.5" />
              رجوع للمشاريع
            </Link>
          </Button>
        }
      />

      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-4">
          {/* Category */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <Label className="mb-3 flex items-center gap-1.5 text-xs font-bold">
              <Tag className="h-3.5 w-3.5 text-electric" /> نوع الطلب
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    "rounded-xl border p-3 text-right transition",
                    category === c.key
                      ? "border-electric bg-electric/10 shadow-glow"
                      : "border-border bg-muted/20 hover:border-electric/40 hover:bg-muted/40",
                  )}
                >
                  <div className="font-bold text-foreground text-[13px]">{c.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{c.hint}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Title + description */}
          <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="flex items-center gap-1.5 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 text-electric" /> عنوان الطلب *
              </Label>
              <Input
                id="title" name="title" required minLength={3} maxLength={160}
                placeholder="مثال: تطوير متجر إلكتروني للعطور بنظام دفع أونلاين"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold">وصف تفصيلي</Label>
              <Textarea
                id="description" name="description" rows={7} maxLength={4000}
                placeholder="اذكر أهدافك، الجمهور المستهدف، مميزات مطلوبة، أمثلة تعجبك، …"
              />
              <div className="text-[10px] text-muted-foreground">
                كلما زادت التفاصيل، كان التقدير أدق. تستطيع لاحقاً إرفاق ملفات من صفحة الطلب.
              </div>
            </div>
          </section>

          {/* Priority */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <Label className="mb-3 flex items-center gap-1.5 text-xs font-bold">
              <Zap className="h-3.5 w-3.5 text-electric" /> الأولوية
            </Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPriority(p.key)}
                  className={cn(
                    "rounded-full px-4 py-2 text-[12px] font-semibold ring-1 transition",
                    priority === p.key
                      ? p.cls + " scale-105"
                      : "bg-muted/30 text-muted-foreground ring-border hover:bg-muted/60",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Budget + dates + contact */}
          <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div>
              <Label className="mb-2 flex items-center gap-1.5 text-xs font-bold">
                <Wallet className="h-3.5 w-3.5 text-electric" /> الميزانية التقديرية (﷼)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input name="budgetMin" type="number" min={0} step="100" placeholder="من" />
                <Input name="budgetMax" type="number" min={0} step="100" placeholder="إلى" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="targetDate" className="flex items-center gap-1.5 text-xs font-bold">
                  <Calendar className="h-3.5 w-3.5 text-electric" /> تاريخ مستهدف
                </Label>
                <Input id="targetDate" name="targetDate" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone" className="flex items-center gap-1.5 text-xs font-bold">
                  <Phone className="h-3.5 w-3.5 text-electric" /> رقم للتواصل
                </Label>
                <Input id="contactPhone" name="contactPhone" type="tel" placeholder="+9665…" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactName" className="flex items-center gap-1.5 text-xs font-bold">
                <UserIcon className="h-3.5 w-3.5 text-electric" /> اسم مسؤول التواصل
              </Label>
              <Input id="contactName" name="contactName" placeholder="اختياري" />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-3 lg:sticky lg:top-4 h-fit">
          <div className="rounded-2xl border border-electric/20 bg-gradient-to-br from-electric/10 via-card to-purple-accent/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-electric to-purple-accent shadow-glow">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <div className="font-black text-sm">جاهز للإرسال؟</div>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3">
              راجع البيانات ثم أرسل الطلب — يمكنك متابعته لحظياً من قسم <b>«طلباتي»</b>.
            </p>
            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 bg-gradient-to-r from-electric to-purple-accent shadow-glow"
            >
              <Rocket className="h-4 w-4" />
              {loading ? "جاري الإرسال…" : "إرسال الطلب"}
            </Button>
            <Button asChild type="button" variant="ghost" className="w-full mt-2">
              <Link to="/client/projects">إلغاء</Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-[12px] text-muted-foreground space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-[13px]">
              <Info className="h-3.5 w-3.5 text-electric" /> نصائح سريعة
            </div>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>وضّح هدف المشروع وجمهوره المستهدف.</li>
              <li>اذكر أمثلة مواقع/تطبيقات ملهمة لك.</li>
              <li>حدد ميزانية واقعية لتسريع التقدير.</li>
              <li>أضف رقم تواصل للردّ الفوري عبر واتساب.</li>
            </ul>
          </div>
        </aside>
      </form>
    </div>
  );
}
