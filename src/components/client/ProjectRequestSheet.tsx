import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Rocket, Wallet, Calendar, Phone, User as UserIcon, Tag, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, apiError } from "@/lib/api";

const CATEGORIES: { key: string; label: string; hint: string }[] = [
  { key: "WEBSITE", label: "موقع إلكتروني", hint: "موقع تعريفي أو متجر" },
  { key: "MOBILE_APP", label: "تطبيق جوال", hint: "iOS / Android" },
  { key: "ADMIN_SYSTEM", label: "نظام إداري", hint: "لوحة تحكم / ERP" },
  { key: "MARKETING", label: "تسويق رقمي", hint: "حملات وسوشيال ميديا" },
  { key: "DESIGN", label: "تصميم / هوية", hint: "هوية بصرية / براندينج" },
  { key: "HOSTING", label: "استضافة / سيرفر", hint: "VPS / مخصص / SMTP" },
  { key: "SUPPORT", label: "دعم وصيانة", hint: "متابعة دورية" },
  { key: "OTHER", label: "طلب مخصص", hint: "اذكر التفاصيل" },
];

const PRIORITIES: { key: string; label: string; cls: string }[] = [
  { key: "LOW", label: "منخفضة", cls: "bg-slate-500/10 text-slate-300 ring-slate-500/20" },
  { key: "NORMAL", label: "عادية", cls: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20" },
  { key: "HIGH", label: "عالية", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  { key: "URGENT", label: "عاجلة", cls: "bg-rose-500/10 text-rose-400 ring-rose-500/20" },
];

export function ProjectRequestSheet({
  open, onOpenChange, staff,
}: { open: boolean; onOpenChange: (v: boolean) => void; staff?: boolean }) {
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
      onOpenChange(false);
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
    } finally { setLoading(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-xl overflow-y-auto bg-card">
        <SheetHeader className="text-right">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-electric to-purple-accent shadow-glow">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-lg">طلب مشروع جديد</SheetTitle>
              <SheetDescription>املأ التفاصيل وسيتواصل معك فريقنا خلال 24 ساعة</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          {/* Category */}
          <div>
            <Label className="mb-2 flex items-center gap-1.5 text-xs"><Tag className="h-3.5 w-3.5" />نوع الطلب</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((c) => (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)}
                  className={cn(
                    "rounded-xl border p-2.5 text-right transition text-[11px]",
                    category === c.key
                      ? "border-electric bg-electric/10 shadow-glow"
                      : "border-border bg-muted/20 hover:border-electric/40 hover:bg-muted/40",
                  )}>
                  <div className="font-bold text-foreground text-xs">{c.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{c.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="flex items-center gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5" />عنوان الطلب *</Label>
            <Input id="title" name="title" required minLength={3} maxLength={160}
              placeholder="مثال: تطوير متجر إلكتروني للعطور بنظام دفع أونلاين" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">وصف تفصيلي</Label>
            <Textarea id="description" name="description" rows={5} maxLength={4000}
              placeholder="اذكر أهدافك، الجمهور المستهدف، مميزات مطلوبة، أمثلة تعجبك، …" />
          </div>

          {/* Priority */}
          <div>
            <Label className="mb-2 flex items-center gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" />الأولوية</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button key={p.key} type="button" onClick={() => setPriority(p.key)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 transition",
                    priority === p.key ? p.cls + " scale-105" : "bg-muted/30 text-muted-foreground ring-border hover:bg-muted/60",
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget range */}
          <div>
            <Label className="mb-2 flex items-center gap-1.5 text-xs"><Wallet className="h-3.5 w-3.5" />الميزانية التقديرية (﷼)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input name="budgetMin" type="number" min={0} step="100" placeholder="من" />
              <Input name="budgetMax" type="number" min={0} step="100" placeholder="إلى" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="targetDate" className="flex items-center gap-1.5 text-xs"><Calendar className="h-3.5 w-3.5" />تاريخ مستهدف</Label>
              <Input id="targetDate" name="targetDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone" className="flex items-center gap-1.5 text-xs"><Phone className="h-3.5 w-3.5" />رقم للتواصل</Label>
              <Input id="contactPhone" name="contactPhone" type="tel" placeholder="+9665…" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactName" className="flex items-center gap-1.5 text-xs"><UserIcon className="h-3.5 w-3.5" />اسم مسؤول التواصل</Label>
            <Input id="contactName" name="contactName" placeholder="اختياري" />
          </div>

          <div className="rounded-xl bg-electric/5 border border-electric/20 p-3 text-[11px] text-muted-foreground">
            💡 كلما كانت التفاصيل أوضح، كان التقدير الزمني والمالي أدق. يمكنك متابعة حالة الطلب لحظياً من قسم <b>«طلباتي»</b>.
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-gradient-to-r from-electric to-purple-accent">
              <Rocket className="h-4 w-4" />
              {loading ? "جاري الإرسال…" : "إرسال الطلب"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
