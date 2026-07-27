import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Star, Quote, TrendingUp, Users, Award, Zap, ArrowLeft,
  ShieldCheck, Landmark, ShoppingBag, GraduationCap, HeartPulse,
  Truck, Plane, Building2, Cpu, Cloud, Lock, BadgeCheck,
} from "lucide-react";

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

const STAT_TONES = [
  {
    grad: "from-electric/25 via-cyan-400/15 to-transparent",
    ring: "border-electric/30",
    icon: "bg-electric/15 text-electric",
    glow: "bg-electric/25",
    num: "from-electric to-cyan-400",
  },
  {
    grad: "from-purple-accent/25 via-fuchsia-400/15 to-transparent",
    ring: "border-purple-accent/30",
    icon: "bg-purple-accent/15 text-purple-accent",
    glow: "bg-purple-accent/25",
    num: "from-purple-accent to-fuchsia-400",
  },
  {
    grad: "from-amber-400/25 via-orange-400/15 to-transparent",
    ring: "border-amber-400/30",
    icon: "bg-amber-400/15 text-amber-500",
    glow: "bg-amber-400/25",
    num: "from-amber-500 to-orange-400",
  },
  {
    grad: "from-emerald-400/25 via-teal-400/15 to-transparent",
    ring: "border-emerald-400/30",
    icon: "bg-emerald-400/15 text-emerald-500",
    glow: "bg-emerald-400/25",
    num: "from-emerald-500 to-teal-400",
  },
];

function Stat({ icon: Icon, value, suffix, label, delay, tone }: { icon: any; value: number; suffix?: string; label: string; delay: number; tone: typeof STAT_TONES[number] }) {
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
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, type: "spring", stiffness: 120, damping: 14 }}
      whileHover={{ y: -4 }}
      className={`group relative rounded-3xl border ${tone.ring} bg-card p-5 sm:p-6 md:p-8 overflow-hidden hover:shadow-glow transition-all`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${tone.grad} opacity-70`} />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, delay }}
        className={`absolute -top-8 -left-8 h-24 w-24 rounded-full ${tone.glow} blur-2xl`}
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, delay: delay + 1 }}
        className={`absolute -bottom-8 -right-8 h-20 w-20 rounded-full ${tone.glow} blur-2xl`}
      />
      <div className="relative">
        <motion.div
          initial={{ rotate: -20, scale: 0 }}
          whileInView={{ rotate: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: delay + 0.2, type: "spring" }}
          className={`grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-xl ${tone.icon} mb-3 sm:mb-4 backdrop-blur group-hover:scale-110 group-hover:rotate-6 transition-transform`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </motion.div>
        <div className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br ${tone.num} bg-clip-text text-transparent`}>
          {v.toLocaleString("en-US")}<span>{suffix}</span>
        </div>
        <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium text-muted-foreground">{label}</div>
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
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-electric/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-72 w-72 rounded-full bg-purple-accent/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="max-w-2xl mb-8 sm:mb-10">
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
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => <Stat key={s.label} {...s} tone={STAT_TONES[i % STAT_TONES.length]} delay={i * 0.1} />)}
        </div>
      </div>
    </section>
  );
}

/* ============ Trust / Sectors ============ */
const SECTORS = [
  { icon: ShoppingBag, label: "التجارة والتجزئة" },
  { icon: Landmark, label: "الجهات الحكومية" },
  { icon: GraduationCap, label: "التعليم" },
  { icon: HeartPulse, label: "الرعاية الصحية" },
  { icon: Building2, label: "العقار والمقاولات" },
  { icon: Truck, label: "اللوجستيات" },
  { icon: Plane, label: "السياحة والسفر" },
  { icon: Cpu, label: "التقنية والناشئة" },
];

const BADGES = [
  { icon: ShieldCheck, label: "متوافق مع ضوابط الأمن السيبراني" },
  { icon: Lock, label: "التزام بنظام حماية البيانات (PDPL)" },
  { icon: Cloud, label: "بنية سحابية متعددة المناطق" },
  { icon: BadgeCheck, label: "اتفاقيات مستوى خدمة 99.9%" },
];

export function HomeLogos() {
  return (
    <section className="relative py-16 md:py-20 border-y border-border overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-card/40 via-background to-card/40" />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute -top-24 right-1/4 h-64 w-64 rounded-full bg-electric/10 blur-3xl" />
      <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-purple-accent/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs font-medium mb-4"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse" /> ثقة تُبنى بالعمل
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            نخدم قطاعات <span className="gradient-text">متعددة</span> بمعايير موحّدة
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
            نلتزم بأعلى مستويات الجودة والامتثال في كل قطاع نعمل معه — بلا استثناء.
          </p>
        </div>

        {/* Sectors grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 mb-10">
          {SECTORS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group relative rounded-2xl border border-border bg-card/70 backdrop-blur p-4 text-center hover:border-electric/40 hover:shadow-glow transition"
            >
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-electric/10 text-electric group-hover:scale-110 transition">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-xs md:text-sm font-semibold leading-tight">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Compliance badges */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BADGES.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 backdrop-blur px-4 py-3"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-electric/20 to-purple-accent/20 text-electric">
                <b.icon className="h-4 w-4" />
              </div>
              <div className="text-xs md:text-sm font-medium leading-snug">{b.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ Testimonials ============ */
const TESTI_TONES = [
  { grad: "from-electric/25 via-cyan-400/15 to-transparent", ring: "border-electric/30", chip: "bg-electric/15 text-electric border-electric/30", glow: "bg-electric/25", avatar: "from-electric to-cyan-400" },
  { grad: "from-purple-accent/25 via-fuchsia-400/15 to-transparent", ring: "border-purple-accent/30", chip: "bg-purple-accent/15 text-purple-accent border-purple-accent/30", glow: "bg-purple-accent/25", avatar: "from-purple-accent to-fuchsia-400" },
  { grad: "from-emerald-400/25 via-teal-400/15 to-transparent", ring: "border-emerald-400/30", chip: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", glow: "bg-emerald-400/25", avatar: "from-emerald-400 to-teal-400" },
  { grad: "from-amber-400/25 via-orange-400/15 to-transparent", ring: "border-amber-400/30", chip: "bg-amber-500/15 text-amber-600 border-amber-500/30", glow: "bg-amber-400/25", avatar: "from-amber-400 to-orange-400" },
  { grad: "from-rose-400/25 via-pink-400/15 to-transparent", ring: "border-rose-400/30", chip: "bg-rose-500/15 text-rose-500 border-rose-500/30", glow: "bg-rose-400/25", avatar: "from-rose-400 to-pink-400" },
  { grad: "from-sky-400/25 via-blue-400/15 to-transparent", ring: "border-sky-400/30", chip: "bg-sky-500/15 text-sky-500 border-sky-500/30", glow: "bg-sky-400/25", avatar: "from-sky-400 to-blue-400" },
];

const TESTIMONIALS = [
  {
    initials: "س.ح",
    role: "رئيس تنفيذي",
    sector: "قطاع التجزئة الرقمية",
    body: "الفريق نقلنا لمستوى مختلف تماماً. النمو في المبيعات فاق توقعاتنا خلال أشهر قليلة، والتنفيذ كان دقيقاً وسريعاً.",
    metric: "+340% مبيعات",
    stars: 5,
  },
  {
    initials: "ل.ش",
    role: "مديرة تقنية",
    sector: "قطاع العقار",
    body: "احترافية استثنائية في التنفيذ. المنصة تعمل بلا انقطاع منذ سنة كاملة وتخدم عشرات آلاف المستخدمين شهرياً بثبات.",
    metric: "99.99% تشغيل",
    stars: 5,
  },
  {
    initials: "خ.ع",
    role: "مؤسس منصة",
    sector: "قطاع السفر والسياحة",
    body: "أفضل شراكة تقنية اختبرناها. سرعة الاستجابة، جودة الكود، والاهتمام بأدق التفاصيل يجعلهم في المقدمة دائماً.",
    metric: "×4.8 ROI",
    stars: 5,
  },
  {
    initials: "ن.ق",
    role: "مديرة تسويق",
    sector: "قطاع الرعاية الصحية",
    body: "استراتيجية المحتوى والإعلانات رفعت ظهورنا العضوي بشكل ملحوظ، مع تقارير أسبوعية واضحة وشفافة.",
    metric: "+220% ظهور",
    stars: 5,
  },
  {
    initials: "ع.م",
    role: "مدير عمليات",
    sector: "قطاع الخدمات اللوجستية",
    body: "أتمتة العمليات وفّرت علينا مئات الساعات شهرياً. لوحات التحكم عملية وسهلة على فرق الميدان.",
    metric: "−62% وقت يدوي",
    stars: 5,
  },
  {
    initials: "ر.ص",
    role: "رئيس أمن معلومات",
    sector: "قطاع مالي",
    body: "معايير الأمان والامتثال طُبّقت باحترافية عالية، مع تدقيق مستمر واستجابة سريعة لأي ملاحظة.",
    metric: "0 حوادث أمنية",
    stars: 5,
  },
];

export function HomeTestimonials() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 -left-24 h-72 w-72 rounded-full bg-electric/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-24 h-72 w-72 rounded-full bg-purple-accent/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center mb-10 md:mb-14">
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
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            شهادات من قادة أعمال في قطاعات متنوعة — أسماء الجهات محفوظة احتراماً لسياسات الخصوصية.
          </p>
        </div>

        <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => {
            const tone = TESTI_TONES[i % TESTI_TONES.length];
            return (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -6 }}
                className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border ${tone.ring} bg-card p-4 md:p-7 transition-all duration-300 hover:shadow-glow`}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.grad} opacity-60`} />
                <div className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full ${tone.glow} blur-3xl opacity-70 group-hover:opacity-100 transition-opacity`} />
                <div className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r ${tone.avatar} opacity-80`} />

                <div className="relative">
                  <Quote className="absolute -top-1 left-0 h-7 w-7 md:h-10 md:w-10 text-foreground/10" />

                  <div className="flex items-center justify-between gap-2 mb-3 md:mb-4 pl-8 md:pl-12">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.stars }).map((_, k) => (
                        <Star key={k} className="h-3 w-3 md:h-4 md:w-4 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 md:py-1 rounded-full border ${tone.chip} shrink-0`}>
                      {t.metric}
                    </span>
                  </div>

                  <p className="relative text-[13px] md:text-[15px] leading-relaxed text-foreground/90 mb-4 md:mb-6 md:min-h-[96px]">
                    {t.body}
                  </p>

                  <div className="flex items-center gap-2.5 md:gap-3 pt-3 md:pt-4 border-t border-border/60">
                    <div className={`h-9 w-9 md:h-11 md:w-11 shrink-0 rounded-xl md:rounded-2xl bg-gradient-to-br ${tone.avatar} text-white font-bold text-xs md:text-sm grid place-items-center shadow-md`}>
                      {t.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs md:text-sm truncate">{t.role}</div>
                      <div className="text-[11px] md:text-xs text-muted-foreground truncate flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{t.sector}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 md:mt-14 flex flex-wrap items-center justify-center gap-3 md:gap-4"
        >
          {[
            { icon: Star, label: "تقييم 4.9/5", tone: "text-amber-500" },
            { icon: ShieldCheck, label: "خصوصية محفوظة", tone: "text-emerald-500" },
            { icon: Users, label: "قطاعات متعددة", tone: "text-electric" },
            { icon: Award, label: "شراكات طويلة الأمد", tone: "text-purple-accent" },
          ].map((b, i) => (
            <div key={i} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium">
              <b.icon className={`h-3.5 w-3.5 ${b.tone}`} />
              {b.label}
            </div>
          ))}
        </motion.div>
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
