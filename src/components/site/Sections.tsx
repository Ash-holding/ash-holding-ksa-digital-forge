import { motion } from "framer-motion";
import {
  Sparkles, Star, ArrowLeft, Code2, Smartphone, LayoutDashboard, Brain, Palette,
  GraduationCap, Wrench, Plug, Search, Compass, PenTool, TestTube2, Rocket,
  HeadphonesIcon, ShieldCheck, Cpu, Cloud, Database, Mail, BarChart3, Target,
  FileText, LifeBuoy, FolderKanban, Receipt, FileSignature, Wallet, Files, Bell,
  Server, Settings2, HardDrive, Globe, Image as ImageIcon, MapPin, Check
} from "lucide-react";

/* ---------------- HERO ---------------- */
export function Hero() {
  const badges = [
    { label: "React", color: "text-cyan-accent" },
    { label: "Next.js", color: "text-foreground" },
    { label: "Laravel", color: "text-orange-accent" },
    { label: "Flutter", color: "text-electric" },
    { label: "WordPress", color: "text-electric-soft" },
    { label: "AI", color: "text-purple-accent" },
    { label: "Cloud", color: "text-cyan-accent" },
    { label: "UI/UX", color: "text-purple-accent" },
    { label: "Marketing", color: "text-orange-accent" },
    { label: "Servers", color: "text-electric" },
  ];
  const positions = [
    "top-[8%] right-[6%]", "top-[16%] left-[8%]", "top-[36%] right-[2%]",
    "top-[52%] left-[4%]", "top-[70%] right-[10%]", "top-[10%] left-[38%]",
    "top-[80%] left-[32%]", "top-[28%] left-[20%]", "top-[62%] right-[22%]",
    "top-[46%] right-[38%]",
  ];
  return (
    <section id="home" className="relative min-h-screen bg-hero pt-28 md:pt-36 pb-20 overflow-hidden">
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-electric/20 blur-3xl animate-blob" />
      <div className="absolute top-1/3 -left-40 h-[420px] w-[420px] rounded-full bg-purple-accent/15 blur-3xl animate-blob" style={{ animationDelay: "3s" }} />
      <div className="absolute bottom-0 right-1/3 h-[380px] w-[380px] rounded-full bg-cyan-accent/15 blur-3xl animate-blob" style={{ animationDelay: "6s" }} />

      <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
           style={{ backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {badges.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.07, duration: 0.6 }}
            className={`absolute ${positions[i]} animate-float`}
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            <div className="glass rounded-full px-4 py-2 shadow-soft flex items-center gap-2 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full bg-current ${b.color}`} />
              {b.label}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative mx-auto max-w-5xl px-4 md:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium mb-6 shadow-soft"
        >
          <Sparkles className="h-3.5 w-3.5 text-electric" />
          شركة سعودية متخصصة في البرمجيات والحلول الرقمية
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.2] tracking-tight"
        >
          حلول رقمية متكاملة
          <br />
          <span className="gradient-text">لبناء وتشغيل أعمالك</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed"
        >
          من الفكرة إلى الإطلاق، نطوّر مواقع، تطبيقات، أنظمة، استضافة، تسويق،
          ولوحات تشغيل مصممة للنمو.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <a href="#contact" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition">
            ابدأ مشروعك <ArrowLeft className="h-4 w-4" />
          </a>
          <a href="#services" className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3.5 text-sm font-semibold shadow-soft hover:bg-secondary transition">
            استكشف خدماتنا
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 inline-flex items-center gap-3 rounded-full glass px-5 py-2.5 shadow-soft"
        >
          <div className="flex">
            {[0,1,2,3,4].map(i => <Star key={i} className="h-4 w-4 fill-orange-accent text-orange-accent" />)}
          </div>
          <div className="text-sm">
            <span className="font-bold">4.9</span>
            <span className="text-muted-foreground"> / بناءً على مشاريع وتجارب عملاء</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- ABOUT ---------------- */
export function About() {
  const stats = [
    { k: "+120", v: "مشروع ناجح" },
    { k: "+40", v: "عميل مؤسسي" },
    { k: "24/7", v: "دعم فني" },
    { k: "8+", v: "سنوات خبرة" },
  ];
  return (
    <section id="about" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-electric" /> من نحن
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            نبني <span className="gradient-text">عالمك الرقمي</span> بمنهجية واضحة
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed md:text-lg">
            <b>ASH HOLDING</b> شركة سعودية تقدم حلولاً رقمية متكاملة تشمل تطوير المواقع
            والتطبيقات، الأنظمة ولوحات التحكم، الاستضافة والسيرفرات، التسويق الرقمي،
            التصميم، والأتمتة الذكية.
          </p>
          <ul className="mt-6 grid sm:grid-cols-2 gap-3">
            {["منهجية أجايل واضحة", "توثيق كامل وعقود شفافة", "فرق سعودية متخصصة", "دعم ما بعد الإطلاق"].map(x => (
              <li key={x} className="flex items-center gap-2 text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-electric/10 text-electric"><Check className="h-3.5 w-3.5" /></span>
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.v} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="text-2xl font-bold gradient-text">{s.k}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <AboutLiveVisual />
      </div>
    </section>
  );
}

/* ---------------- ABOUT — animated live visual ---------------- */
function AboutLiveVisual() {
  const servers = [
    { label: "SRV-01", region: "الرياض", load: 62 },
    { label: "SRV-02", region: "جدة", load: 38 },
    { label: "SRV-03", region: "الدمام", load: 81 },
    { label: "SRV-04", region: "Edge", load: 24 },
  ];
  return (
    <div className="relative h-[560px]">
      {/* Ambient glow */}
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-electric/20 via-cyan-accent/10 to-purple-accent/15 blur-3xl -z-10" />

      {/* ---- Card 1: Live browser / website build ---- */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="absolute top-0 right-0 w-[68%] rounded-2xl overflow-hidden shadow-soft border border-border bg-card"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/60">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-accent" />
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-accent" />
          <span className="h-2.5 w-2.5 rounded-full bg-electric" />
          <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background px-3 py-1 text-[10px] text-muted-foreground font-mono">
            <Globe className="h-3 w-3 text-electric" /> ashholding.sa
          </div>
        </div>
        {/* Fake site skeleton being "built" */}
        <div className="p-4 bg-gradient-to-br from-navy to-electric/90 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25"
               style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          {/* nav bar */}
          <div className="relative flex items-center gap-2">
            <div className="h-5 w-16 rounded-md bg-white/25" />
            <div className="mr-auto flex gap-1.5">
              {[0,1,2,3].map(i => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: -4 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }} viewport={{ once: true }}
                  className="h-3 w-10 rounded bg-white/20" />
              ))}
            </div>
          </div>
          {/* hero block */}
          <div className="relative mt-4 grid grid-cols-5 gap-3">
            <div className="col-span-3 space-y-2">
              <motion.div initial={{ width: 0 }} whileInView={{ width: "80%" }} transition={{ duration: 1, delay: 0.4 }} viewport={{ once: true }}
                className="h-4 rounded bg-white/85" />
              <motion.div initial={{ width: 0 }} whileInView={{ width: "60%" }} transition={{ duration: 1, delay: 0.6 }} viewport={{ once: true }}
                className="h-3 rounded bg-white/60" />
              <motion.div initial={{ width: 0 }} whileInView={{ width: "45%" }} transition={{ duration: 1, delay: 0.8 }} viewport={{ once: true }}
                className="h-3 rounded bg-white/50" />
              <div className="pt-2 flex gap-2">
                <motion.div initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} viewport={{ once: true }}
                  className="h-6 w-20 rounded-md bg-cyan-accent" />
                <motion.div initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1 }} viewport={{ once: true }}
                  className="h-6 w-14 rounded-md bg-white/25" />
              </div>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} viewport={{ once: true }}
              className="col-span-2 h-24 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 grid place-items-center">
              <LayoutDashboard className="h-8 w-8 text-white/70" />
            </motion.div>
          </div>
          {/* deploying strip */}
          <div className="relative mt-4 flex items-center gap-2 text-[10px] text-white/85 font-mono">
            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            deploying build #2026.11 …
            <span className="mr-auto text-white/55">edge · ksa</span>
          </div>
        </div>
      </motion.div>

      {/* ---- Card 2: Server rack with live metrics ---- */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} viewport={{ once: true }}
        className="absolute bottom-0 left-0 w-[62%] rounded-2xl overflow-hidden shadow-soft border border-border bg-card"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary/60">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Server className="h-3.5 w-3.5 text-electric" /> بنية السيرفرات · مباشر
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            متصل
          </div>
        </div>
        <div className="p-3 space-y-2">
          {servers.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }} viewport={{ once: true }}
              className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2"
            >
              <div className="grid h-8 w-8 place-items-center rounded-md bg-electric/10 text-electric">
                <HardDrive className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>{s.label}</span>
                  <span className="text-muted-foreground font-normal">{s.region}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
                  <motion.div
                    initial={{ width: 0 }} whileInView={{ width: `${s.load}%` }}
                    transition={{ duration: 1.1, delay: 0.4 + i * 0.1 }} viewport={{ once: true }}
                    className={`h-full rounded-full ${s.load > 75 ? "bg-orange-accent" : s.load > 50 ? "bg-electric" : "bg-emerald-500"}`}
                  />
                </div>
              </div>
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }}
                className={`h-2 w-2 rounded-full ${s.load > 75 ? "bg-orange-accent" : "bg-emerald-500"}`}
              />
            </motion.div>
          ))}
          {/* Live throughput bars */}
          <div className="pt-1 flex items-end gap-1 h-10">
            {Array.from({ length: 22 }).map((_, i) => (
              <motion.span key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-electric to-cyan-accent"
                animate={{ height: ["20%", `${30 + ((i * 17) % 70)}%`, "35%", "70%", "25%"] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: (i % 6) * 0.12, ease: "easeInOut" }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
            <span>معدل الطلبات · req/s</span>
            <span className="font-mono">1.2k ↑</span>
          </div>
        </div>
      </motion.div>

      {/* ---- Floating pill: data flow ---- */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }} viewport={{ once: true }}
        className="absolute top-[46%] left-[6%] glass rounded-2xl p-3 shadow-glow animate-float z-10"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-primary-foreground">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-1.5">
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }}
                className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              تدفق البيانات
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                42.8 MB/s ↔
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ---- Floating pill: ISO ---- */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} viewport={{ once: true }}
        className="absolute top-[8%] left-[4%] glass rounded-2xl p-3 shadow-glow z-10"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-[11px] font-bold">ISO Ready</div>
            <div className="text-[10px] text-muted-foreground">أمن مؤسسي</div>
          </div>
        </div>
      </motion.div>

      {/* ---- Animated connection lines (SVG) ---- */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 560" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ashLine" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.62 0.19 256)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="oklch(0.7 0.16 200)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <motion.path
          d="M 300,180 C 240,260 180,320 90,420"
          stroke="url(#ashLine)" strokeWidth="1.5" fill="none" strokeDasharray="4 6"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          transition={{ duration: 1.4, delay: 0.4 }} viewport={{ once: true }}
        />
        <motion.circle r="3" fill="oklch(0.7 0.16 200)"
          animate={{ offsetDistance: ["0%", "100%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          style={{ offsetPath: "path('M 300,180 C 240,260 180,320 90,420')" } as React.CSSProperties}
        />
      </svg>
    </div>
  );
}


/* ---------------- SERVICES ---------------- */
export function Services() {
  const items = [
    { icon: Code2, title: "تطوير المواقع والمنصات", desc: "مواقع ومنصات ويب مؤسسية عالية الأداء وقابلة للتوسع.", color: "electric", tags: ["Next.js", "React", "Node.js"] },
    { icon: Smartphone, title: "تطبيقات الجوال", desc: "تطبيقات iOS و Android بتجربة استخدام سلسة وأداء أصلي.", color: "cyan-accent", tags: ["iOS", "Android", "Flutter"] },
    { icon: LayoutDashboard, title: "الأنظمة ولوحات التحكم", desc: "أنظمة إدارية مخصصة تربط عملياتك في مكان واحد.", color: "purple-accent", tags: ["ERP", "CRM", "Dashboards"] },
    { icon: Brain, title: "الذكاء الاصطناعي والأتمتة", desc: "حلول AI وأتمتة تسرّع أعمالك وتحسّن اتخاذ القرار.", color: "orange-accent", tags: ["AI Agents", "RAG", "Automation"] },
    { icon: Palette, title: "التصميم والهوية", desc: "هويات بصرية وواجهات UI/UX تنقل قيمة علامتك بوضوح.", color: "electric", tags: ["Branding", "UI/UX", "Design System"] },
    { icon: GraduationCap, title: "خدمات الطلاب والأعمال", desc: "حلول متخصصة للطلاب ورواد الأعمال بأسعار مدروسة.", color: "cyan-accent", tags: ["MVP", "بحوث", "استشارات"] },
    { icon: Wrench, title: "الدعم الفني والتشغيل", desc: "دعم مستمر وتشغيل موثوق بعد الإطلاق على مدار الساعة.", color: "purple-accent", tags: ["24/7", "SLA", "Monitoring"] },
    { icon: Plug, title: "التكاملات والربط البرمجي", desc: "ربط الأنظمة عبر APIs بأمان وكفاءة عالية.", color: "orange-accent", tags: ["REST", "GraphQL", "Webhooks"] },
  ];

  const stats = [
    { v: "+8", l: "خدمات متكاملة" },
    { v: "+120", l: "مشروع منفذ" },
    { v: "24/7", l: "دعم متواصل" },
    { v: "99.9%", l: "نسبة توفر" },
  ];

  return (
    <section id="services" className="relative py-20 sm:py-24 md:py-32 bg-secondary/40 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-24 right-[10%] h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-electric/10 blur-3xl" />
        <div className="absolute -bottom-24 left-[5%] h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-purple-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium mb-4 border border-border">
            <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse" /> خدماتنا
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            خدمات <span className="gradient-text">ASH HOLDING</span> الرقمية
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
            كل ما تحتاجه لبناء مشروع رقمي متكامل، من البنية التقنية إلى النمو والتسويق.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-14">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-card/70 backdrop-blur px-4 py-4 text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-extrabold gradient-text">{s.v}</div>
              <div className="mt-1 text-[11px] sm:text-xs md:text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((s, i) => (
            <motion.article
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
              className="group relative rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-card hover:shadow-glow hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className={`absolute -top-16 -left-16 h-40 w-40 rounded-full bg-${s.color}/15 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-${s.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

              <div className="relative flex items-start justify-between mb-4">
                <div className={`grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl bg-${s.color}/10 text-${s.color} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <s.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/60">0{i + 1}</span>
              </div>

              <h3 className="relative text-base sm:text-lg font-bold mb-2 leading-snug">{s.title}</h3>
              <p className="relative text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{s.desc}</p>

              <div className="relative flex flex-wrap gap-1.5 mb-4">
                {s.tags.map((t) => (
                  <span key={t} className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-foreground/70 border border-border">
                    {t}
                  </span>
                ))}
              </div>

              <a href="#contact" className={`relative inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-${s.color} group-hover:gap-2.5 transition-all`}>
                اطلب الخدمة
                <span className="inline-block rotate-180">→</span>
              </a>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <a href="#contact" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold shadow-soft hover:shadow-glow transition">
            ابدأ مشروعك الآن
          </a>
          <a href="#process" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold hover:bg-secondary transition">
            تعرف على منهجيتنا
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------------- HOSTING ---------------- */
export function Hosting() {
  const items = [
    { icon: Server, t: "استضافة مشتركة", d: "بيئة سريعة وآمنة للمواقع والمنصات." },
    { icon: Cpu, t: "VPS", d: "خوادم افتراضية بأداء ومرونة عالية." },
    { icon: Database, t: "سيرفرات مخصصة", d: "بنية مؤسسية للتطبيقات الحساسة." },
    { icon: Settings2, t: "إدارة Nginx و Linux", d: "إعداد وإدارة كاملة باحتراف." },
    { icon: HardDrive, t: "قواعد بيانات", d: "PostgreSQL و MySQL بإدارة ومراقبة." },
    { icon: Mail, t: "SMTP والبريد", d: "حلول بريد بأعلى معدلات إيصال." },
    { icon: Cloud, t: "نسخ احتياطي", d: "نسخ يومية آمنة قابلة للاستعادة." },
    { icon: ShieldCheck, t: "مراقبة وحماية", d: "مراقبة ٢٤/٧ وحماية متعددة الطبقات." },
  ];
  return (
    <section id="hosting" className="relative py-24 md:py-32 bg-dark text-primary-foreground overflow-hidden">
      <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-electric/20 blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-purple-accent/15 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full glass-dark px-3 py-1 text-xs font-medium mb-4 text-white">
            <Cloud className="h-3.5 w-3.5" /> الاستضافة والبنية التحتية
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">استضافة وسيرفرات مصممة للاستقرار</h2>
          <p className="mt-4 text-white/70">من الاستضافة المشتركة إلى السيرفرات المخصصة، بأمان وأداء عاليين.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((h, i) => (
            <motion.div
              key={h.t}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="glass-dark rounded-3xl p-6 hover:bg-white/10 transition"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-electric/20 text-electric-soft mb-4">
                <h.icon className="h-6 w-6" />
              </div>
              <div className="text-base font-bold">{h.t}</div>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">{h.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- MARKETING ---------------- */
export function Marketing() {
  const items = [
    { icon: Search, t: "SEO", d: "تحسين ظهورك في نتائج البحث بشكل مستدام." },
    { icon: Target, t: "الإعلانات المدفوعة", d: "حملات ذكية بعائد استثمار قابل للقياس." },
    { icon: FileText, t: "إدارة المحتوى", d: "محتوى عربي احترافي متسق مع علامتك." },
    { icon: ImageIcon, t: "الهوية البصرية", d: "بناء هوية بصرية ثابتة ومميزة." },
    { icon: Globe, t: "صفحات الهبوط", d: "صفحات هبوط عالية التحويل." },
    { icon: BarChart3, t: "التحليلات والتقارير", d: "قرارات مبنية على بيانات دقيقة." },
  ];
  return (
    <section id="marketing" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium mb-3">التسويق الرقمي</div>
          <h2 className="text-3xl md:text-4xl font-bold">نمو رقمي مبني على نتائج</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m, i) => (
            <motion.div
              key={m.t}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-3xl border border-border bg-card p-6 shadow-card hover:shadow-glow hover:-translate-y-1 transition"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-electric/10 text-electric mb-4">
                <m.icon className="h-6 w-6" />
              </div>
              <div className="text-lg font-bold">{m.t}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- PROCESS ---------------- */
export function Process() {
  const steps = [
    { icon: Search, t: "الاستكشاف", d: "فهم عميق لأهداف عملك والمتطلبات." },
    { icon: Compass, t: "التخطيط", d: "خارطة طريق واضحة وجدول زمني." },
    { icon: PenTool, t: "التصميم", d: "تجربة استخدام وواجهات مصقولة." },
    { icon: Wrench, t: "التطوير", d: "برمجة نظيفة وقابلة للتوسع." },
    { icon: TestTube2, t: "الاختبار", d: "ضمان جودة على كل المستويات." },
    { icon: Rocket, t: "الإطلاق", d: "نشر آمن على بيئات الإنتاج." },
    { icon: HeadphonesIcon, t: "الدعم والنمو", d: "متابعة، تحسين وتطوير مستمر." },
  ];
  return (
    <section id="process" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-hero opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium mb-4">منهجية العمل</div>
          <h2 className="text-3xl md:text-4xl font-bold">منهجية عمل واضحة من الفكرة إلى الإطلاق</h2>
        </div>
        <div className="relative">
          <div className="absolute top-8 right-4 left-4 h-px bg-gradient-to-l from-transparent via-electric/40 to-transparent hidden md:block" />
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            {steps.map((s, i) => (
              <motion.div
                key={s.t}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="relative text-center"
              >
                <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand text-primary-foreground shadow-glow">
                  <s.icon className="h-7 w-7" />
                  <div className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-card border border-border text-[10px] font-bold text-foreground">{i + 1}</div>
                </div>
                <div className="mt-4 font-bold">{s.t}</div>
                <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- CLIENT PORTAL PREVIEW ---------------- */
export function ClientPortal() {
  const cards = [
    { icon: FolderKanban, t: "المشاريع", v: "12", c: "electric" },
    { icon: Receipt, t: "الفواتير", v: "8", c: "cyan-accent" },
    { icon: FileSignature, t: "العقود", v: "5", c: "purple-accent" },
    { icon: LifeBuoy, t: "تذاكر الدعم", v: "2", c: "orange-accent" },
    { icon: Sparkles, t: "الخدمات النشطة", v: "6", c: "electric" },
    { icon: Wallet, t: "المدفوعات", v: "12,450 ﷼", c: "cyan-accent" },
    { icon: Files, t: "الملفات", v: "34", c: "purple-accent" },
    { icon: Bell, t: "التنبيهات", v: "3", c: "orange-accent" },
  ];
  return (
    <section id="portal" className="py-24 md:py-32 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 md:px-8 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs font-medium mb-3">
            بوابة العملاء
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            منطقة عملاء منظمة <span className="gradient-text">لإدارة المشاريع والخدمات</span>
          </h2>
          <p className="mt-5 text-muted-foreground md:text-lg leading-relaxed">
            نوفر للعميل تجربة واضحة لمتابعة المشروع، العقود، الفواتير، الدعم،
            الملفات، والمدفوعات من مكان واحد.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#" className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow">دخول العملاء</a>
            <a href="#contact" className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold">طلب حساب جديد</a>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="rounded-3xl border border-border bg-card p-5 shadow-soft"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-primary-foreground text-xs font-bold">A</div>
              <div className="text-sm font-bold">بوابة العملاء</div>
            </div>
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-accent" />
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-accent" />
              <span className="h-2.5 w-2.5 rounded-full bg-electric" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cards.map((c) => (
              <div key={c.t} className={`rounded-2xl bg-${c.c}/5 border border-${c.c}/20 p-3.5`}>
                <div className={`grid h-9 w-9 place-items-center rounded-xl bg-${c.c}/15 text-${c.c} mb-2`}>
                  <c.icon className="h-4 w-4" />
                </div>
                <div className="text-[11px] text-muted-foreground">{c.t}</div>
                <div className="text-sm font-bold mt-0.5">{c.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-secondary p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">أحدث المشاريع</div>
              <div className="text-xs text-muted-foreground">هذا الأسبوع</div>
            </div>
            {["منصة تجارة إلكترونية", "تطبيق حجوزات", "نظام إدارة داخلي"].map((p, i) => (
              <div key={p} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${i === 0 ? "bg-electric" : i === 1 ? "bg-cyan-accent" : "bg-orange-accent"}`} />
                  {p}
                </div>
                <div className="text-xs text-muted-foreground">{[80, 45, 20][i]}%</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- WHY ASH ---------------- */
export function Why() {
  const items = [
    { icon: MapPin, t: "شركة سعودية", d: "قاعدة محلية وفهم عميق للسوق." },
    { icon: FileSignature, t: "عقود واضحة", d: "شفافية كاملة في النطاق والأسعار." },
    { icon: Globe, t: "تصميم عربي احترافي", d: "تجربة استخدام RTL أصيلة ومصقولة." },
    { icon: Cloud, t: "أنظمة قابلة للتوسع", d: "بنية سحابية تنمو مع عملك." },
    { icon: Server, t: "استضافة وتشغيل", d: "بنية تحتية موثوقة تعمل بلا توقف." },
    { icon: HeadphonesIcon, t: "دعم بعد الإطلاق", d: "متابعة وصيانة وتحديثات مستمرة." },
  ];
  return (
    <section id="why" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium mb-3">لماذا ASH</div>
          <h2 className="text-3xl md:text-4xl font-bold">شريك تقني تثق به المؤسسات</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w, i) => (
            <motion.div
              key={w.t}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-3xl border border-border bg-card p-7 shadow-card hover:border-electric/40 transition"
            >
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-primary-foreground">
                  <w.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-lg font-bold">{w.t}</div>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{w.d}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
export function CTA() {
  return (
    <section id="contact" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-dark px-8 md:px-16 py-16 md:py-24 text-primary-foreground text-center shadow-glow">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-electric/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-purple-accent/25 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full glass-dark px-3 py-1 text-xs font-medium mb-5">
              <Sparkles className="h-3.5 w-3.5 text-electric-soft" /> ابدأ اليوم
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              جاهز تبدأ <span className="gradient-text">مشروعك الرقمي؟</span>
            </h2>
            <p className="mt-5 text-white/70 max-w-2xl mx-auto md:text-lg">
              أرسل لنا فكرتك، ونحولها إلى خطة تنفيذ واضحة قابلة للتسليم والتطوير.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#" className="rounded-xl bg-white text-navy-deep px-6 py-3.5 text-sm font-semibold shadow-glow hover:bg-ice transition">تواصل معنا</a>
              <a href="#portal" className="rounded-xl glass-dark text-white px-6 py-3.5 text-sm font-semibold hover:bg-white/10 transition">دخول العملاء</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
