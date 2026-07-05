import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { HelpCircle, Plus, MessageCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة | ASH HOLDING" },
      { name: "description", content: "إجابات واضحة حول الخدمات، العقود، الأسعار، والدعم." },
    ],
  }),
});

function FaqVisual() {
  return (
    <div className="relative h-[420px] w-full grid place-items-center">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute h-64 w-64 rounded-full bg-electric/20 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="relative grid h-40 w-40 place-items-center rounded-3xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow"
      >
        <HelpCircle className="h-20 w-20" />
      </motion.div>
      {["؟", "!", "؟"].map((c, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
          className="absolute grid h-12 w-12 place-items-center rounded-2xl bg-card border border-border shadow-card text-electric font-black text-xl"
          style={{
            top: `${20 + i * 25}%`,
            left: `${15 + i * 30}%`,
          }}
        >
          {c}
        </motion.div>
      ))}
    </div>
  );
}

const faqs = [
  { q: "ما نوع المشاريع التي تنفذونها؟", a: "ننفذ مشاريع الويب، تطبيقات الجوال، الأنظمة الإدارية، حلول الذكاء الاصطناعي، والتكاملات البرمجية للشركات والمؤسسات." },
  { q: "كم يستغرق تنفيذ المشروع؟", a: "يعتمد على حجم وتعقيد المشروع. المشاريع الصغيرة 4-6 أسابيع، والمتوسطة 2-4 أشهر، والكبيرة 4-8 أشهر." },
  { q: "كيف تحسبون تكلفة المشروع؟", a: "نقدم تقييماً مجانياً بعد جلسة اكتشاف. التكلفة تعتمد على النطاق، التعقيد، والمدة الزمنية. نقدم عقوداً واضحة بدون رسوم خفية." },
  { q: "هل تقدمون دعماً بعد الإطلاق؟", a: "نعم، نقدم عقود دعم وصيانة مرنة تشمل التحديثات، المراقبة، وإصلاح الأعطال على مدار الساعة." },
  { q: "من يملك الكود بعد التسليم؟", a: "العميل يملك كامل حقوق الملكية الفكرية والكود المصدري بعد التسليم، مع توثيق شامل." },
  { q: "هل توقعون اتفاقية سرية NDA؟", a: "نعم، نوقع اتفاقية سرية قبل بدء أي مشروع لحماية بيانات ومعلومات العميل بشكل كامل." },
  { q: "هل تعملون مع الشركات الناشئة؟", a: "بالطبع، لدينا باقات مخصصة للشركات الناشئة تشمل بناء MVP بأسعار مدروسة." },
  { q: "ما التقنيات التي تستخدمونها؟", a: "نستخدم أحدث التقنيات: React, Next.js, Node.js, PostgreSQL, Flutter, وغيرها حسب متطلبات المشروع." },
];

function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <PageShell>
      <PageHero
        eyebrow="الأسئلة الشائعة"
        title="كل ما تحتاج معرفته"
        gradient="عن خدماتنا"
        description="جمعنا لك أهم الأسئلة التي تصلنا من عملائنا بإجابات واضحة ومباشرة. إذا لم تجد إجابتك، تواصل معنا مباشرة."
        visual={<FaqVisual />}
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8">
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl border bg-card overflow-hidden transition ${isOpen ? "border-electric shadow-glow" : "border-border"}`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-right"
                  >
                    <span className="font-bold text-base md:text-lg">{f.q}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${isOpen ? "bg-electric text-white" : "bg-secondary text-foreground"}`}
                    >
                      <Plus className="h-4 w-4" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="px-5 pb-5 text-muted-foreground leading-relaxed border-t border-border pt-4">
                          {f.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 rounded-3xl bg-gradient-to-br from-electric to-purple-accent text-white p-8 text-center"
          >
            <MessageCircle className="h-10 w-10 mx-auto mb-3" />
            <h3 className="text-2xl font-bold mb-2">لديك سؤال آخر؟</h3>
            <p className="text-white/80 mb-5">فريقنا جاهز للإجابة على كل استفساراتك</p>
            <a href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-white text-electric px-6 py-3 font-bold hover:scale-105 transition">
              تواصل معنا
            </a>
          </motion.div>
        </div>
      </section>
    </PageShell>
  );
}
