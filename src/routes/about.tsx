import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useSpring, useInView, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/site/PageShell";
import {
  Target,
  Eye,
  Compass,
  Award,
  Users,
  Rocket,
  Globe,
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  Code2,
  Cpu,
  ArrowLeft,
  ChevronLeft,
  Star,
  TrendingUp,
  Heart,
  Lightbulb,
  Handshake,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "من نحن | ASH HOLDING — شركة علي صالح الشهري القابضة" },
      {
        name: "description",
        content:
          "ASH HOLDING شركة سعودية رائدة في بناء الحلول الرقمية المؤسسية. تعرّف على قصتنا، رؤيتنا، فريقنا، والقيم التي نصنع بها الأثر.",
      },
      { property: "og:title", content: "من نحن | ASH HOLDING" },
      {
        property: "og:description",
        content: "شركة سعودية متخصصة في بناء وتشغيل الحلول الرقمية بمعايير عالمية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* ============================================================
   Reusable primitives
   ============================================================ */

function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.floor(v)),
    });
    return () => controls.stop();
  }, [inView, to]);
  return (
    <span ref={ref}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

/* ============================================================
   HERO — cinematic animated intro
   ============================================================ */

function HeroVisual() {
  const layers = [
    { size: 320, delay: 0, dur: 30, color: "from-electric/30 to-cyan-accent/10" },
    { size: 240, delay: 0.2, dur: 24, color: "from-purple-accent/30 to-electric/10" },
    { size: 160, delay: 0.4, dur: 18, color: "from-orange-accent/30 to-purple-accent/10" },
  ];
  const nodes = Array.from({ length: 6 });
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-md sm:h-[500px]">
      {/* orbits */}
      {[140, 200, 260].map((r, i) => (
        <motion.div
          key={r}
          className="absolute left-1/2 top-1/2 rounded-full border border-electric/15"
          style={{ width: r * 2, height: r * 2, x: -r, y: -r }}
          animate={{ rotate: 360 }}
          transition={{ duration: 30 + i * 12, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute h-2.5 w-2.5 rounded-full bg-electric shadow-glow"
            style={{ top: -5, left: "50%", transform: "translateX(-50%)" }}
          />
          {i === 1 && (
            <div
              className="absolute h-2 w-2 rounded-full bg-purple-accent"
              style={{ top: "50%", left: -4, transform: "translateY(-50%)" }}
            />
          )}
        </motion.div>
      ))}

      {/* blurred layers */}
      {layers.map((l, i) => (
        <motion.div
          key={i}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br ${l.color} blur-2xl`}
          style={{ width: l.size, height: l.size }}
          animate={{ scale: [1, 1.15, 1], rotate: [0, 30, 0] }}
          transition={{ duration: l.dur, repeat: Infinity, ease: "easeInOut", delay: l.delay }}
        />
      ))}

      {/* floating nodes */}
      {nodes.map((_, i) => {
        const angle = (i / nodes.length) * Math.PI * 2;
        const radius = 180;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/80 backdrop-blur shadow-card"
            style={{ x: x - 20, y: y - 20 }}
            animate={{ y: [y - 20, y - 30, y - 20] }}
            transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          >
            {[<Code2 />, <Cpu />, <Layers />, <ShieldCheck />, <Sparkles />, <Zap />][i]?.type ? (
              <span className="text-electric">
                {[<Code2 className="h-5 w-5" />, <Cpu className="h-5 w-5" />, <Layers className="h-5 w-5" />, <ShieldCheck className="h-5 w-5" />, <Sparkles className="h-5 w-5" />, <Zap className="h-5 w-5" />][i]}
              </span>
            ) : null}
          </motion.div>
        );
      })}

      {/* center emblem */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "backOut" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="relative grid h-32 w-32 place-items-center rounded-3xl bg-gradient-to-br from-navy via-electric to-purple-accent text-white shadow-glow"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
          <span className="relative text-3xl font-black tracking-tight">ASH</span>
          <motion.div
            className="absolute -inset-2 rounded-3xl border border-electric/40"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, 80]);
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-hero" />
        <motion.div
          style={{ y }}
          className="absolute -top-32 right-1/4 h-[600px] w-[600px] rounded-full bg-electric/15 blur-3xl"
        />
        <motion.div
          style={{ y }}
          className="absolute -bottom-40 -left-32 h-[500px] w-[500px] rounded-full bg-purple-accent/15 blur-3xl"
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        {/* breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground"
        >
          <Link to="/" className="hover:text-electric transition">الرئيسية</Link>
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">من نحن</span>
        </motion.div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/5 px-4 py-1.5 text-xs font-medium text-electric"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse" />
              شركة سعودية · تأسست عام ٢٠٢٠
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              نصنع البنية الرقمية
              <br />
              <span className="relative inline-block">
                <span className="gradient-text">للمؤسسات الطموحة</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1, delay: 0.9, ease: "easeOut" }}
                  className="absolute -bottom-2 left-0 right-0 h-1 origin-right rounded-full bg-gradient-to-l from-electric via-purple-accent to-orange-accent"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 max-w-xl text-base leading-loose text-muted-foreground sm:text-lg"
            >
              في <b className="text-foreground">ASH HOLDING</b>، لا نبني منتجات رقمية فحسب،
              بل نُهندس أنظمة كاملة تُدير الأعمال، تفتح أسواقًا جديدة، وتُترجم رؤية
              عملائنا إلى واقع قابل للقياس. خبرة تقنية عميقة، منهجية موثّقة، والتزام
              مطلق بالجودة.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
              >
                ابدأ مشروعك معنا
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              </Link>
              <Link
                to="/why"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-6 py-3 text-sm font-bold hover:border-electric hover:text-electric transition"
              >
                لماذا ASH؟
              </Link>
            </motion.div>

            {/* trust bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-electric" />
                معتمدون في المملكة
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-orange-accent" />
                تقييم ٤.٩ من عملائنا
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-accent" />
                نخدم +١٥ دولة
              </div>
            </motion.div>
          </div>

          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   STATS — animated counters
   ============================================================ */

function Stats() {
  const items = [
    { icon: Rocket, v: 120, suffix: "+", l: "مشروع منفَّذ" },
    { icon: Users, v: 80, suffix: "+", l: "عميل يثقون بنا" },
    { icon: Globe, v: 15, suffix: "+", l: "دولة نغطيها" },
    { icon: TrendingUp, v: 99, suffix: "٪", l: "معدل رضا العملاء" },
  ];
  return (
    <section className="relative overflow-hidden bg-dark py-16 text-white md:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/30 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {items.map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-electric/40 hover:bg-white/10"
            >
              <s.icon className="mb-4 h-8 w-8 text-electric transition group-hover:scale-110" />
              <div className="text-4xl font-extrabold tracking-tight md:text-5xl">
                <span className="gradient-text">
                  <Counter to={s.v} suffix={s.suffix} />
                </span>
              </div>
              <div className="mt-2 text-sm text-white/70">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PILLARS — Mission / Vision / Values with animated cards
   ============================================================ */

function Pillars() {
  const items = [
    {
      icon: Target,
      title: "رسالتنا",
      desc: "تمكين المؤسسات من التحول الرقمي عبر منتجات موثوقة، قابلة للتوسع، ومصمّمة لتصنع أثرًا حقيقيًا في السوق.",
      color: "electric",
    },
    {
      icon: Eye,
      title: "رؤيتنا",
      desc: "أن نكون الشريك التقني الأول للمؤسسات الطموحة في المنطقة، ومرجعًا في هندسة الأنظمة المؤسسية.",
      color: "purple-accent",
    },
    {
      icon: Compass,
      title: "قيمنا",
      desc: "الإتقان، الشفافية، الالتزام، والابتكار المستمر. نقيس نجاحنا بأثر عملائنا لا بحجم أعمالنا.",
      color: "orange-accent",
    },
  ];
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <SectionHeader
          eyebrow="من نحن"
          title="ثلاث ركائز نبني عليها"
          sub="كل قرار نتخذه، وكل سطر نكتبه، ينطلق من هذه الركائز الثلاث."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div
                className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-${it.color}/10 blur-2xl transition group-hover:scale-150`}
              />
              <div
                className={`relative mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-${it.color}/10 text-${it.color} transition group-hover:scale-110 group-hover:rotate-3`}
              >
                <it.icon className="h-8 w-8" />
              </div>
              <h3 className="relative mb-3 text-2xl font-bold">{it.title}</h3>
              <p className="relative leading-loose text-muted-foreground">{it.desc}</p>
              <div className="relative mt-6 flex items-center gap-2 text-sm font-medium text-electric opacity-0 transition group-hover:opacity-100">
                اعرف المزيد <ArrowLeft className="h-4 w-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   STORY — timeline / journey
   ============================================================ */

function Story() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });
  const scaleY = useTransform(progress, [0, 1], [0, 1]);

  const milestones = [
    { year: "٢٠٢٠", title: "الانطلاقة", desc: "تأسست ASH برؤية واضحة لبناء منتجات رقمية بمعايير عالمية.", icon: Rocket },
    { year: "٢٠٢٢", title: "توسّع الفريق", desc: "نمو الفريق إلى خبراء متخصصين في التطوير، التصميم، والاستشارات.", icon: Users },
    { year: "٢٠٢٤", title: "الانتشار الإقليمي", desc: "بدء تقديم خدماتنا لعملاء في أكثر من ١٥ دولة عربية وعالمية.", icon: Globe },
    { year: "٢٠٢٦", title: "منصات الذكاء الاصطناعي", desc: "إطلاق خط خدمات متكامل للذكاء الاصطناعي والأتمتة المؤسسية.", icon: Cpu },
  ];

  return (
    <section className="relative overflow-hidden py-20 md:py-28 bg-gradient-to-b from-background to-secondary/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
        <SectionHeader eyebrow="قصتنا" title="رحلة نصنعها خطوة بخطوة" sub="من فكرة إلى شراكات مؤسسية عبر المنطقة." />

        <div ref={ref} className="relative mt-16">
          {/* vertical line */}
          <div className="absolute right-6 top-0 h-full w-px bg-border md:right-1/2 md:translate-x-px" />
          <motion.div
            style={{ scaleY, originY: 0 }}
            className="absolute right-6 top-0 h-full w-px bg-gradient-to-b from-electric via-purple-accent to-orange-accent md:right-1/2 md:translate-x-px"
          />

          <div className="space-y-12">
            {milestones.map((m, i) => (
              <motion.div
                key={m.year}
                initial={{ opacity: 0, x: i % 2 === 0 ? 40 : -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
                className={`relative grid gap-6 md:grid-cols-2 md:gap-12 ${
                  i % 2 === 0 ? "" : "md:[&>*:first-child]:col-start-2"
                }`}
              >
                <div className={i % 2 === 0 ? "md:text-left md:pr-12" : "md:pr-0 md:pl-12"}>
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-card transition hover:shadow-glow">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-electric/10 px-3 py-1 text-xs font-bold text-electric">
                      {m.year}
                    </div>
                    <h4 className="mb-2 text-xl font-bold">{m.title}</h4>
                    <p className="leading-loose text-muted-foreground">{m.desc}</p>
                  </div>
                </div>

                {/* node */}
                <div className="absolute right-6 top-6 -translate-x-1/2 translate-x-[7px] md:right-1/2 md:translate-x-1/2">
                  <div className="relative grid h-12 w-12 place-items-center rounded-2xl border border-electric/30 bg-background shadow-glow">
                    <m.icon className="h-5 w-5 text-electric" />
                    <span className="absolute inset-0 animate-ping rounded-2xl border border-electric/40" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CULTURE — how we work
   ============================================================ */

function Culture() {
  const items = [
    { icon: Lightbulb, t: "فضول لا يهدأ", d: "نتعلّم بنهم ونطبّق أحدث ما يخدم عملاءنا فعليًا." },
    { icon: Handshake, t: "شراكة لا مورد", d: "نُفكّر معك، لا نستلم ونسلّم فقط." },
    { icon: ShieldCheck, t: "جودة قابلة للقياس", d: "معايير هندسية، اختبارات، ومراجعات على كل ما نُنجزه." },
    { icon: Heart, t: "احترام الوقت", d: "التزام صارم بالجداول والوعود التي نقطعها." },
  ];
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <SectionHeader eyebrow="ثقافتنا" title="كيف نعمل من الداخل" sub="مبادئ تحكم قراراتنا اليومية قبل أن تصل إلى مخرجاتنا." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={it.t}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-secondary/30 p-6 transition hover:border-electric/40"
            >
              <it.icon className="mb-4 h-8 w-8 text-electric transition group-hover:-rotate-6 group-hover:scale-110" />
              <h4 className="mb-1.5 text-lg font-bold">{it.t}</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">{it.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   INDUSTRIES marquee
   ============================================================ */

function Industries() {
  const items = [
    "الحكومي", "التجزئة", "الرعاية الصحية", "التعليم", "المالية والفنتك",
    "العقارات", "اللوجستيات", "المطاعم", "السياحة", "الصناعة", "الطاقة", "الإعلام",
  ];
  return (
    <section className="border-y border-border bg-secondary/30 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          قطاعات نخدمها
        </div>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <motion.div
            className="flex gap-4 whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          >
            {[...items, ...items].map((it, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground/80"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-electric" />
                {it}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CTA
   ============================================================ */

function CTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] bg-dark p-8 text-white shadow-glow md:p-14"
        >
          <div className="absolute inset-0 opacity-40">
            <div className="absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-electric/40 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-purple-accent/30 blur-3xl" />
          </div>
          <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-electric" />
                جاهزون لبناء مشروعك القادم
              </div>
              <h3 className="text-3xl font-extrabold leading-tight md:text-4xl lg:text-5xl">
                حوّل فكرتك إلى منتج رقمي <span className="gradient-text">يصنع الفارق</span>
              </h3>
              <p className="mt-4 max-w-xl leading-loose text-white/70">
                احجز جلسة استشارية مجانية مع فريقنا، ودعنا نُصمّم معك مسار التنفيذ الأنسب لمشروعك.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                to="/contact"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-electric px-8 py-4 text-sm font-bold text-white shadow-glow transition hover:scale-[1.02]"
              >
                تواصل معنا
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              </Link>
              <Link
                to="/process"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-sm font-bold text-white/90 backdrop-blur transition hover:bg-white/10"
              >
                اطّلع على آلية العمل
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   Shared header
   ============================================================ */

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-electric"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-electric" />
        {eyebrow}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl"
      >
        {title}
      </motion.h2>
      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-4 leading-loose text-muted-foreground"
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */

function AboutPage() {
  // scroll progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 20 });
  return (
    <PageShell>
      <motion.div
        style={{ scaleX, originX: 1 }}
        className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-gradient-to-l from-electric via-purple-accent to-orange-accent"
      />
      <Hero />
      <Stats />
      <Pillars />
      <Story />
      <Culture />
      <Industries />
      <CTA />
    </PageShell>
  );
}

/* silence unused import warnings for motion helpers */
void useMotionValue;
