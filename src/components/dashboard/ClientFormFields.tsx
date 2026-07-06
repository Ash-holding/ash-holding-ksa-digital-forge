import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building2, MapPin, Lock } from "lucide-react";
import type { ReactNode } from "react";

export type ClientFormValues = {
  name?: string; email?: string; password?: string; phone?: string;
  companyName?: string; commercialNumber?: string; taxNumber?: string;
  contactEmail?: string; address?: string; city?: string; country?: string;
};

function Section({ icon: Icon, title, description, children }: {
  icon: React.ComponentType<{ className?: string }>; title: string; description?: string; children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-electric/10 text-electric shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold">{title}</h2>
          {description && <p className="text-[11px] sm:text-xs text-foreground/70 mt-0.5">{description}</p>}
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function Field({ label, name, type = "text", required, defaultValue, placeholder, dir, span, minLength }: {
  label: string; name: string; type?: string; required?: boolean;
  defaultValue?: string; placeholder?: string; dir?: "ltr" | "rtl"; span?: boolean; minLength?: number;
}) {
  return (
    <div className={`space-y-1.5 ${span ? "sm:col-span-2" : ""}`}>
      <Label className="text-[12px] font-semibold">{label}{required && <span className="text-rose-400"> *</span>}</Label>
      <Input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} dir={dir} minLength={minLength} />
    </div>
  );
}

export function ClientFormFields({ mode, defaults }: {
  mode: "create" | "edit"; defaults?: ClientFormValues;
}) {
  return (
    <div className="grid gap-4">
      <Section icon={User} title="بيانات الحساب" description="حساب دخول العميل — يستخدمه لتسجيل الدخول للوحة العميل.">
        <Field label="الاسم الكامل" name="name" required defaultValue={defaults?.name} />
        <Field label="البريد الإلكتروني" name="email" type="email" required dir="ltr" defaultValue={defaults?.email} />
        {mode === "create" && (
          <Field label="كلمة السر" name="password" type="password" required dir="ltr" minLength={8} placeholder="8 أحرف على الأقل" />
        )}
        <Field label="الجوال" name="phone" dir="ltr" defaultValue={defaults?.phone} placeholder="+9665..." />
      </Section>

      <Section icon={Building2} title="بيانات الشركة" description="اسم الشركة والمعرّفات النظامية (السجل التجاري والرقم الضريبي).">
        <Field label="اسم الشركة" name="companyName" span defaultValue={defaults?.companyName} />
        <Field label="السجل التجاري" name="commercialNumber" dir="ltr" defaultValue={defaults?.commercialNumber} />
        <Field label="الرقم الضريبي" name="taxNumber" dir="ltr" defaultValue={defaults?.taxNumber} />
        <Field label="بريد التواصل الرسمي" name="contactEmail" type="email" dir="ltr" defaultValue={defaults?.contactEmail} />
      </Section>

      <Section icon={MapPin} title="العنوان والموقع" description="عنوان الشركة الرئيسي — يظهر على الفواتير والعقود.">
        <Field label="المدينة" name="city" defaultValue={defaults?.city} />
        <Field label="الدولة" name="country" dir="ltr" defaultValue={defaults?.country ?? "SA"} />
        <Field label="العنوان التفصيلي" name="address" span defaultValue={defaults?.address} />
      </Section>

      {mode === "create" && (
        <p className="flex items-start gap-2 text-[11px] text-foreground/70">
          <Lock className="h-3 w-3 mt-0.5 shrink-0" />
          سيتم إنشاء الحساب بحالة "قيد المراجعة" وحالة توثيق "غير موثّق"، ويمكنك توثيقه لاحقاً من صفحة تفاصيل العميل.
        </p>
      )}
    </div>
  );
}
