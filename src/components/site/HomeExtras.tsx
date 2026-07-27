import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star, Quote, TrendingUp, Users, Award, Zap, ArrowLeft } from "lucide-react";

/* ============ Counter ============ */
function useCountUp(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setValue(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

function Stat({ icon: Icon, value, suffix, label, delay }: { icon: any; value: number; suffix?: string; label: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.4 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const v = useCountUp(value, 1800, inView);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="group relative rounded-3xl border border-border bg-card p-6 md:p-8 overflow-hidden hover:border-electric/40 hover:shadow-glow transition"
    >
      <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-electric/10 blur-2xl group-hover:bg-electric/20 transition" />
      <div className="relative">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-electric/10 text-electric mb-4">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-4xl md:text-5xl font-extrabold tracking-tight">
          {v.toLocaleString("en-US")}<span className="gradient-text">{suffix}</span>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">{label}</div>
      </div>
    </motion.div>
  );
}

export function HomeStats() {
  const stats = [
    { icon: TrendingUp, value: 320, suffix: "+", label: "مشروع منجز بنجاح" },
    { icon: Users, value: 180, suffix: "+", label: "عميل يثق بنا" },
    { icon: Award, value: 12, suffix: "", label: "جائزة وشهادة" },
    { icon: Zap, value: 99, suffix: "%", label: "معدل رضا العملاء" },
  ];
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="max-w-2xl mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs font-medium mb-4"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse" /> بالأرقام
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            نتائج <span className="gradient-text">تتحدث عن نفسها</span>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => <Stat key={s.label} {...s} delay={i * 0.08} />)}
        </div>
      </div>
    </section>
  );
}

/* ============ Client Logos Marquee ============ */
const LOGOS = [
  "نور للتجارة", "إيليت العقارية", "أكاديمية المستقبل", "مجموعة صحّة",
  "منصة سفر", "بنك رقمي", "لوجستيات الشرق", "شهيّة", "الرياض تك",
  "جلف كلاود", "بترو سيرف", "التقنية الذكية",
];

export function HomeLogos() {
  return (
    <section className="py-12 border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center text-sm text-muted-foreground mb-6">
          يثق بنا أكثر من 180 عميلاً في المنطقة
        </div>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-10 whitespace-nowrap"
          >
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <div
                key={i}
                className="shrink-0 rounded-xl border border-border bg-card px-6 py-4 text-lg font-bold text-muted-foreground hover:text-electric hover:border-electric/40 transition"
              >
                {l}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============ Testimonials ============ */
const TESTIMONIALS = [
  {
    name: "أ. سعود الحربي",
    role: "الرئيس التنفيذي — نور للتجارة",
    body: "فريق ASH نقل متجرنا لمستوى مختلف تماماً. النمو في المبيعات فاق توقعاتنا بنسبة 340% خلال ستة أشهر.",
    stars: 5,
  },
  {
    name: "م. لينا الشمري",
    role: "مديرة التقنية — إيليت العقارية",
    body: "احترافية استثنائية في التنفيذ. المنصة تعمل الآن بلا انقطاع منذ سنة كاملة وتخدم 45 ألف مستخدم شهرياً.",
    stars: 5,
  },
  {
    name: "د. خالد العتيبي",
    role: "مؤسس — منصة سفر",
    body: "أفضل شراكة تقنية اختبرناها. سرعة الاستجابة، جودة الكود، والاهتمام بأدق التفاصيل يجعلهم في المقدمة.",
    stars: 5,
  },
];

export function HomeTestimonials() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs font-medium mb-4"
          >
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> آراء عملائنا
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            قصص نجاح <span className="gradient-text">حقيقية</span>
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-3xl border border-border bg-card p-8 hover:border-electric/40 hover:shadow-glow transition"
            >
              <Quote className="absolute top-6 left-6 h-10 w-10 text-electric/10" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <p className="text-base leading-relaxed mb-6">{t.body}</p>
              <div className="pt-4 border-t border-border">
                <div className="font-bold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ Featured Projects ============ */
export function HomeFeaturedProjects() {
  const items = [
    { title: "متجر نور الإلكتروني", cat: "منصة ويب", metric: "+340% مبيعات", slug: "noor-mart", tone: "from-blue-500/40 via-cyan-500/20 to-transparent" },
    { title: "تطبيق طلاّب", cat: "تطبيق جوال", metric: "200K طالب نشط", slug: "tallab-app", tone: "from-cyan-500/40 via-teal-500/20 to-transparent" },
    { title: "سفر AI", cat: "ذكاء اصطناعي", metric: "94% دقة اقتراح", slug: "safar-ai", tone: "from-violet-500/40 via-purple-500/20 to-transparent" },
  ];
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs font-medium mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse" /> أعمالنا
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              مشاريع <span className="gradient-text">مختارة</span>
            </h2>
          </div>
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold text-sm hover:border-electric/40 transition"
          >
            كل المشاريع <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to="/portfolio/$slug"
                params={{ slug: p.slug }}
                className="group block overflow-hidden rounded-3xl border border-border bg-card hover:border-electric/40 hover:shadow-glow transition"
              >
                <div className={`relative h-40 bg-gradient-to-br ${p.tone}`}>
                  <div className="absolute top-4 right-4 rounded-full bg-background/60 backdrop-blur px-3 py-1 text-xs font-semibold">
                    {p.cat}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-electric transition">{p.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold gradient-text">{p.metric}</span>
                    <ArrowLeft className="h-4 w-4 text-electric group-hover:-translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
