import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Search, PenTool, Code2, TestTube2, Rocket, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/process")({
  component: ProcessPage,
  head: () => ({
    meta: [
      { title: "آلية العمل | ASH HOLDING" },
      { name: "description", content: "خطوات منظمة واحترافية من التحليل إلى التسليم والدعم." },
    ],
  }),
});

function ProcessVisual() {
  return (
    <div className="relative h-[420px] w-full grid place-items-center">
      <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full">
        <motion.path
          d="M50 200 Q 200 50 350 200 T 50 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 6"
          className="text-electric/40"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </svg>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * 140;
        const y = Math.sin(angle) * 140;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="absolute grid h-14 w-14 place-items-center rounded-2xl bg-card border border-border shadow-card text-electric font-black"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            0{i + 1}
          </motion.div>
        );
      })}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow"
      >
        <Rocket className="h-10 w-10" />
      </motion.div>
    </div>
  );
}

function ProcessPage() {
  const steps = [
    { icon: Search, t: "الاكتشاف والتحليل", d: "نستمع لأهدافك، ندرس السوق، ونحلل المتطلبات لبناء رؤية واضحة.", dur: "أسبوع" },
    { icon: PenTool, t: "التصميم والنماذج", d: "تصاميم UX/UI احترافية ونماذج تفاعلية للمراجعة والاعتماد.", dur: "أسبوعان" },
    { icon: Code2, t: "التطوير والبناء", d: "برمجة نظيفة قابلة للتوسع، بمنهجية Agile وتحديثات دورية.", dur: "4-8 أسابيع" },
    { icon: TestTube2, t: "الاختبار والجودة", d: "اختبارات شاملة للأداء، الأمان، والتوافق قبل الإطلاق.", dur: "أسبوع" },
    { icon: Rocket, t: "الإطلاق والنشر", d: "نشر احترافي على البيئة الإنتاجية مع مراقبة كاملة.", dur: "3 أيام" },
    { icon: LifeBuoy, t: "الدعم والصيانة", d: "دعم مستمر، تحديثات، ومراقبة لضمان الاستمرارية.", dur: "دائم" },
  ];
  return (
    <PageShell>
      <PageHero
        eyebrow="آلية العمل"
        title="منهجية واضحة من"
        gradient="الفكرة إلى الإطلاق"
        description="نتبع منهجية مؤسسية مثبتة، تضمن جودة التنفيذ والتسليم في المواعيد المحددة، مع شفافية كاملة في كل خطوة."
        visual={<ProcessVisual />}
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <div className="relative">
            {/* vertical line */}
            <div className="absolute right-6 md:right-8 top-0 bottom-0 w-px bg-gradient-to-b from-electric via-purple-accent to-transparent" />
            <div className="space-y-8">
              {steps.map((s, i) => (
                <motion.div
                  key={s.t}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="relative pr-16 md:pr-20"
                >
                  <div className="absolute right-0 top-0 grid h-12 w-12 md:h-16 md:w-16 place-items-center rounded-2xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow">
                    <s.icon className="h-5 w-5 md:h-7 md:w-7" />
                  </div>
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-glow transition">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg md:text-xl font-bold">{s.t}</h3>
                      <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-electric/10 text-electric">{s.dur}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{s.d}</p>
                    <div className="mt-4 text-xs font-mono text-muted-foreground/60">STEP 0{i + 1} / 06</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
