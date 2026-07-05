import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Target, Eye, Compass, Award, Users, Rocket, Globe, Zap } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "من نحن | ASH HOLDING" },
      { name: "description", content: "تعرف على ASH HOLDING، رؤيتنا ورسالتنا في بناء الحلول الرقمية المؤسسية." },
    ],
  }),
});

function AboutVisual() {
  const orbits = [120, 180, 240];
  return (
    <div className="relative h-[420px] w-full grid place-items-center">
      {orbits.map((r, i) => (
        <motion.div
          key={r}
          className="absolute rounded-full border border-electric/20"
          style={{ width: r * 2, height: r * 2 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20 + i * 10, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute h-3 w-3 rounded-full bg-electric shadow-glow"
            style={{ top: -6, left: "50%", transform: "translateX(-50%)" }}
          />
        </motion.div>
      ))}
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="relative z-10 grid h-32 w-32 place-items-center rounded-3xl bg-gradient-to-br from-electric to-purple-accent text-white text-2xl font-black shadow-glow"
      >
        ASH
      </motion.div>
    </div>
  );
}

function AboutPage() {
  const values = [
    { icon: Target, t: "الرسالة", d: "تمكين الشركات من التحول الرقمي عبر حلول تقنية موثوقة وقابلة للتوسع." },
    { icon: Eye, t: "الرؤية", d: "أن نكون الشريك التقني الأول للمؤسسات الطموحة في المنطقة." },
    { icon: Compass, t: "القيم", d: "الإتقان، الشفافية، الالتزام، والابتكار المستمر في كل مشروع." },
  ];
  const stats = [
    { icon: Rocket, v: "+120", l: "مشروع منفذ" },
    { icon: Users, v: "+80", l: "عميل موثوق" },
    { icon: Globe, v: "+15", l: "دولة" },
    { icon: Award, v: "5", l: "سنوات خبرة" },
  ];
  return (
    <PageShell>
      <PageHero
        eyebrow="من نحن"
        title="نبني الحلول الرقمية"
        gradient="التي تصنع الفارق"
        description="ASH HOLDING شركة تقنية متخصصة في تطوير الأنظمة والمنصات المؤسسية، نجمع بين الخبرة العميقة والتقنيات الحديثة لنقدم حلولاً تُحدث أثراً حقيقياً."
        visual={<AboutVisual />}
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {values.map((v, i) => (
              <motion.div
                key={v.t}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative rounded-3xl border border-border bg-card p-8 shadow-card hover:shadow-glow transition"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-electric/10 text-electric mb-5 group-hover:scale-110 transition">
                  <v.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-2">{v.t}</h3>
                <p className="text-muted-foreground leading-relaxed">{v.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-dark text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-electric/30 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {stats.map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center rounded-2xl glass-dark p-6"
              >
                <s.icon className="h-8 w-8 mx-auto mb-3 text-electric" />
                <div className="text-3xl md:text-4xl font-extrabold gradient-text">{s.v}</div>
                <div className="mt-1 text-sm text-white/70">{s.l}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8 text-center">
          <Zap className="h-10 w-10 mx-auto mb-4 text-electric" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">قصتنا</h2>
          <p className="text-muted-foreground leading-loose text-lg">
            بدأت ASH HOLDING برؤية واضحة: أن نقدم حلولاً رقمية بمعايير عالمية للسوق العربي. اليوم، نفخر بأننا أصبحنا شريكاً استراتيجياً لعشرات المؤسسات في مختلف القطاعات، نساعدهم على بناء منتجات رقمية ناجحة، ونمكّنهم من مواكبة أحدث التقنيات مع الحفاظ على أعلى معايير الجودة والأمان.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
