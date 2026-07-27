import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "تواصل معنا | ASH HOLDING" },
      { name: "description", content: "ابدأ مشروعك أو اطلب استشارة مجانية مع فريق ASH HOLDING. نرد خلال 24 ساعة." },
      { property: "og:title", content: "تواصل معنا | ASH HOLDING" },
      { property: "og:description", content: "استشارة مجانية ومقترح مبدئي خلال 24 ساعة." },
      { property: "og:type", content: "website" },
    ],
  }),
});

const contactSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(80, "الاسم طويل"),
  email: z.string().trim().email("البريد غير صحيح").max(120),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  company: z.string().trim().max(80).optional().or(z.literal("")),
  projectType: z.string().min(1, "اختر نوع المشروع"),
  budget: z.string().min(1, "اختر الميزانية"),
  message: z.string().trim().min(20, "أخبرنا أكثر (20 حرف على الأقل)").max(1500),
});

type ContactForm = z.infer<typeof contactSchema>;

const PROJECT_TYPES = [
  "منصة ويب / متجر إلكتروني",
  "تطبيق جوال",
  "نظام إداري / ERP",
  "ذكاء اصطناعي / أتمتة",
  "بنية سحابية / DevOps",
  "تصميم UI/UX",
  "استشارة تقنية",
  "أخرى",
];

const BUDGET_RANGES = [
  "أقل من 25,000 ر.س",
  "25,000 - 75,000 ر.س",
  "75,000 - 200,000 ر.س",
  "200,000 - 500,000 ر.س",
  "أكثر من 500,000 ر.س",
  "غير محدد بعد",
];

function ContactVisual() {
  return (
    <div className="relative h-[420px] w-full grid place-items-center">
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute h-72 w-72 rounded-full bg-electric/10 blur-3xl"
      />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-electric/30"
          initial={{ width: 100, height: 100, opacity: 1 }}
          animate={{ width: 350, height: 350, opacity: 0 }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
        />
      ))}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative grid h-32 w-32 place-items-center rounded-3xl bg-gradient-to-br from-electric to-cyan-accent text-white shadow-glow"
      >
        <Send className="h-14 w-14" />
      </motion.div>
    </div>
  );
}

function Field({
  label, error, children, required,
}: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs text-rose-500">
          <AlertCircle className="h-3 w-3" /> {error}
        </div>
      )}
    </div>
  );
}

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ContactForm>({
    name: "", email: "", phone: "", company: "",
    projectType: "", budget: "", message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-electric transition text-sm";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const errs: Partial<Record<keyof ContactForm, string>> = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof ContactForm;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    // simulate send; real backend hook can be added later
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSent(true);
  };

  const info = [
    { icon: Mail, t: "البريد الإلكتروني", d: "contact@ashholding.com", href: "mailto:contact@ashholding.com" },
    { icon: Phone, t: "الهاتف", d: "+966 55 123 4567", href: "tel:+966551234567" },
    { icon: MapPin, t: "المقر", d: "الرياض، المملكة العربية السعودية" },
    { icon: Clock, t: "ساعات العمل", d: "الأحد - الخميس، 9ص - 6م" },
  ];

  return (
    <PageShell>
      <PageHero
        eyebrow="تواصل معنا"
        title="لنبدأ العمل"
        gradient="على مشروعك"
        description="أخبرنا عن مشروعك أو فكرتك، وسنرد خلال 24 ساعة بمقترح مبدئي واستشارة مجانية. جميع المحادثات سرية."
        visual={<ContactVisual />}
      />

      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3 rounded-3xl border border-border bg-card p-6 md:p-10 shadow-card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-electric/10 text-electric">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">أخبرنا عن مشروعك</h2>
                  <p className="text-sm text-muted-foreground">استشارة مجانية · رد خلال 24 ساعة</p>
                </div>
              </div>

              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <div className="grid h-20 w-20 mx-auto place-items-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">تم استلام رسالتك</h3>
                  <p className="text-muted-foreground mb-6">سنتواصل معك على {form.email} خلال 24 ساعة</p>
                  <button
                    onClick={() => { setSent(false); setForm({ name:"", email:"", phone:"", company:"", projectType:"", budget:"", message:"" }); }}
                    className="text-electric font-semibold hover:underline"
                  >
                    إرسال رسالة أخرى
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="الاسم الكامل" required error={errors.name}>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="محمد أحمد" />
                    </Field>
                    <Field label="البريد الإلكتروني" required error={errors.email}>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="you@example.com" />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="رقم الهاتف" error={errors.phone}>
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+966 5X XXX XXXX" />
                    </Field>
                    <Field label="الشركة / الجهة" error={errors.company}>
                      <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} placeholder="اسم الشركة" />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="نوع المشروع" required error={errors.projectType}>
                      <select value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} className={inputCls}>
                        <option value="">اختر نوع المشروع</option>
                        {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="الميزانية التقديرية" required error={errors.budget}>
                      <select value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className={inputCls}>
                        <option value="">اختر النطاق</option>
                        {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="تفاصيل المشروع" required error={errors.message}>
                    <textarea
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className={inputCls + " resize-none"}
                      placeholder="أخبرنا عن أهدافك، الجمهور المستهدف، والمواصفات الأساسية..."
                    />
                    <div className="mt-1 text-xs text-muted-foreground text-left">{form.message.length}/1500</div>
                  </Field>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-electric to-purple-accent text-white px-6 py-4 font-bold shadow-glow hover:scale-[1.02] transition disabled:opacity-60 disabled:hover:scale-100"
                  >
                    {submitting ? "جارِ الإرسال..." : (<><Send className="h-5 w-5" /> إرسال الرسالة</>)}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Info + Map */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 space-y-4"
            >
              {info.map((it, i) => {
                const Row = (
                  <div className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:shadow-glow hover:border-electric/40 transition">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-electric/10 text-electric group-hover:scale-110 transition">
                      <it.icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-muted-foreground mb-1">{it.t}</div>
                      <div className="font-bold text-base break-words">{it.d}</div>
                    </div>
                  </div>
                );
                return (
                  <motion.div
                    key={it.t}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {it.href ? <a href={it.href}>{Row}</a> : Row}
                  </motion.div>
                );
              })}

              {/* Map */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl border border-border overflow-hidden shadow-card"
              >
                <iframe
                  title="موقع ASH HOLDING - الرياض"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=46.5500%2C24.6500%2C46.8500%2C24.8500&layer=mapnik&marker=24.7136%2C46.6753"
                  className="w-full h-64 border-0"
                  loading="lazy"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
