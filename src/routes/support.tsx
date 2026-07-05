import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { LifeBuoy, Ticket, BookOpen, MessageCircle, Zap, Shield, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "الدعم الفني | ASH HOLDING" },
      { name: "description", content: "الوصول إلى فريق الدعم، فتح تذاكر، ومتابعة الطلبات على مدار الساعة." },
    ],
  }),
});

function SupportVisual() {
  return (
    <div className="relative h-[420px] w-full grid place-items-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute h-80 w-80 rounded-full border border-dashed border-electric/30"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute h-60 w-60 rounded-full border border-dashed border-purple-accent/30"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-electric to-cyan-accent text-white shadow-glow"
      >
        <LifeBuoy className="h-16 w-16" />
      </motion.div>
      {[
        { icon: MessageCircle, top: "10%", left: "10%" },
        { icon: Ticket, top: "10%", right: "10%" },
        { icon: BookOpen, bottom: "10%", left: "15%" },
        { icon: Shield, bottom: "10%", right: "15%" },
      ].map((it, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
          className="absolute grid h-12 w-12 place-items-center rounded-2xl bg-card border border-border shadow-card text-electric"
          style={it as React.CSSProperties}
        >
          <it.icon className="h-6 w-6" />
        </motion.div>
      ))}
    </div>
  );
}

function SupportPage() {
  const channels = [
    { icon: Ticket, t: "نظام التذاكر", d: "افتح تذكرة دعم وتتبع حالتها من منطقة العملاء.", cta: "افتح تذكرة", color: "electric" },
    { icon: MessageCircle, t: "الدردشة المباشرة", d: "تحدث مع فريق الدعم مباشرة خلال ساعات العمل.", cta: "ابدأ الدردشة", color: "cyan-accent" },
    { icon: BookOpen, t: "قاعدة المعرفة", d: "مقالات وأدلة تساعدك على استخدام خدماتنا بكفاءة.", cta: "تصفح المقالات", color: "purple-accent" },
    { icon: LifeBuoy, t: "الدعم الطارئ", d: "خط ساخن للحالات الحرجة، متاح 24/7 للعملاء المؤسسيين.", cta: "اتصل الآن", color: "orange-accent" },
  ];
  const sla = [
    { icon: Zap, t: "استجابة سريعة", d: "< 15 دقيقة للحالات الحرجة" },
    { icon: Clock, t: "متاح 24/7", d: "دعم على مدار الساعة" },
    { icon: Shield, t: "SLA مضمون", d: "اتفاقية مستوى خدمة موثقة" },
    { icon: CheckCircle2, t: "حل مضمون", d: "حتى إغلاق التذكرة نهائياً" },
  ];
  return (
    <PageShell>
      <PageHero
        eyebrow="الدعم الفني"
        title="فريق دعم يعمل"
        gradient="على مدار الساعة"
        description="نحن ملتزمون بضمان استمرارية خدماتك. فريق الدعم الفني متاح دائماً للإجابة على استفساراتك وحل أي تحديات تواجهها."
        visual={<SupportVisual />}
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">قنوات الدعم <span className="gradient-text">المتاحة</span></h2>
            <p className="text-muted-foreground mt-3">اختر القناة الأنسب للتواصل مع فريقنا</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {channels.map((c, i) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-glow hover:-translate-y-1 transition-all"
              >
                <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-${c.color}/10 text-${c.color} mb-4 group-hover:scale-110 group-hover:rotate-6 transition`}>
                  <c.icon className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">{c.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{c.d}</p>
                <div className={`inline-flex items-center gap-1.5 text-sm font-semibold text-${c.color}`}>
                  {c.cta}
                  <span className="rotate-180">→</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-dark text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 right-1/4 h-96 w-96 rounded-full bg-electric/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-purple-accent/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">التزامنا في <span className="gradient-text">اتفاقية الخدمة</span></h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sla.map((s, i) => (
              <motion.div
                key={s.t}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl glass-dark p-6 text-center"
              >
                <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-electric/20 text-electric mb-4">
                  <s.icon className="h-7 w-7" />
                </div>
                <div className="font-bold text-lg mb-1">{s.t}</div>
                <div className="text-sm text-white/70">{s.d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
