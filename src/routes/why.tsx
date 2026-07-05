import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { ShieldCheck, Zap, Users, Trophy, Clock, HeartHandshake, LineChart, Lock } from "lucide-react";

export const Route = createFileRoute("/why")({
  component: WhyPage,
  head: () => ({
    meta: [
      { title: "لماذا ASH HOLDING | ASH HOLDING" },
      { name: "description", content: "منهجية واضحة، تنفيذ احترافي، ودعم مستمر بعد الإطلاق." },
    ],
  }),
});

function WhyVisual() {
  return (
    <div className="relative h-[420px] w-full">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.15 }}
          className="absolute rounded-2xl border border-border bg-card shadow-card p-4 flex items-center gap-3"
          style={{
            top: `${i * 22}%`,
            right: `${i * 8}%`,
            width: "70%",
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            className="grid h-10 w-10 place-items-center rounded-xl bg-electric/10 text-electric shrink-0"
          >
            <ShieldCheck className="h-5 w-5" />
          </motion.div>
          <div className="min-w-0">
            <div className="text-sm font-bold">جودة معتمدة</div>
            <div className="text-xs text-muted-foreground truncate">مطابقة لأعلى المعايير الدولية</div>
          </div>
          <div className="mr-auto text-xs font-bold text-electric">0{i + 1}</div>
        </motion.div>
      ))}
    </div>
  );
}

function WhyPage() {
  const reasons = [
    { icon: Trophy, t: "خبرة مؤسسية", d: "+5 سنوات في تنفيذ مشاريع لشركات ومؤسسات كبرى." },
    { icon: Zap, t: "تنفيذ سريع", d: "دورات تسليم قصيرة مع الحفاظ على الجودة العالية." },
    { icon: ShieldCheck, t: "أمان مؤسسي", d: "معايير أمان صارمة وحماية للبيانات في كل طبقة." },
    { icon: Users, t: "فريق متخصص", d: "مطورون، مصممون، وخبراء تسويق تحت سقف واحد." },
    { icon: Clock, t: "دعم 24/7", d: "فريق دعم متاح على مدار الساعة لضمان الاستمرارية." },
    { icon: HeartHandshake, t: "شراكة طويلة", d: "نبني علاقات طويلة الأمد لا مجرد صفقات." },
    { icon: LineChart, t: "نتائج قابلة للقياس", d: "نركز على KPIs واضحة تُحدث فرقاً في أعمالك." },
    { icon: Lock, t: "شفافية كاملة", d: "تقارير دورية ووضوح في كل خطوة من المشروع." },
  ];
  return (
    <PageShell>
      <PageHero
        eyebrow="لماذا ASH"
        title="نصنع الفرق بـ"
        gradient="التزام وتنفيذ"
        description="أكثر من مجرد مزود خدمات، نحن شريكك التقني الذي يفهم أعمالك ويعمل معك لتحقيق أهدافك الرقمية بأفضل الممارسات العالمية."
        visual={<WhyVisual />}
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">ثمانية أسباب <span className="gradient-text">تجعلنا خيارك الأول</span></h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((r, i) => (
              <motion.div
                key={r.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.08 }}
                className="group relative rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-glow hover:-translate-y-1 transition-all overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-electric via-purple-accent to-cyan-accent opacity-0 group-hover:opacity-100 transition" />
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-electric/10 text-electric mb-4 group-hover:rotate-6 transition">
                  <r.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold mb-2">{r.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
