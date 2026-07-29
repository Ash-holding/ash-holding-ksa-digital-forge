import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Shield, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { CATALOG } from "@/lib/services-catalog";


const CATS = CATALOG.map((c) => ({
  ...c,
  items: c.items.slice(0, 4),
}));

// keep type export shape for below usage
type _T = LucideIcon;


const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 90, damping: 16 } },
};

export function ServiceCatalog() {
  return (
    <section className="relative space-y-6">
      {/* Hero band */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8"
      >
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-electric/30 to-purple-accent/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0 space-y-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-electric ring-1 ring-electric/30"
            >
              <Sparkles className="h-3.5 w-3.5" /> كتالوج خدمات ASH HOLDING
            </motion.div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight text-white">
              حلول رقمية متكاملة <span className="bg-gradient-to-r from-electric via-cyan-400 to-purple-accent bg-clip-text text-transparent">تُبنى بمعايير عالمية</span>
            </h2>
            <p className="max-w-2xl text-sm sm:text-base leading-7 text-slate-300">
              استكشف أقسام خدماتنا الأربعة — من البرمجة والأنظمة إلى التسويق والتصميم — واطلب ما يناسب أعمالك برصيد محفظتك أو عبر تمويل داخلي دون رسوم.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { icon: Zap, t: "تسليم سريع" },
                { icon: Shield, t: "ضمان جودة" },
                { icon: Rocket, t: "دعم مستمر" },
              ].map((b) => (
                <span key={b.t} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-white/10">
                  <b.icon className="h-3.5 w-3.5 text-electric" /> {b.t}
                </span>
              ))}
            </div>
          </div>
          <Link
            to="/client/services/new"
            className="group inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-electric to-purple-accent px-5 py-3 text-sm font-bold text-white shadow-lg shadow-electric/30 transition hover:-translate-y-0.5"
          >
            اطلب خدمة جديدة
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
          </Link>
        </div>
      </motion.div>

      {/* Categories bento */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-4 lg:grid-cols-2"
      >
        {CATS.map((c, idx) => (
          <motion.article
            key={c.key}
            variants={item}
            whileHover={{ y: -4 }}
            className={`group relative overflow-hidden rounded-3xl border border-border bg-card/60 p-5 sm:p-6 ring-1 ${c.ring} transition ${c.glow} hover:border-transparent`}
          >
            <div aria-hidden className={`pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br ${c.gradient} opacity-[0.14] blur-3xl transition-opacity duration-500 group-hover:opacity-[0.28]`} />
            <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${c.gradient} opacity-70`} />

            <header className="relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
              <motion.div
                initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
                whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 + 0.1, type: "spring", stiffness: 180 }}
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.gradient} text-white shadow-xl`}
              >
                <c.icon className="h-6 w-6" />
              </motion.div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{c.eyebrow}</div>
                <h3 className="mt-0.5 truncate text-lg sm:text-xl font-black text-foreground">{c.title}</h3>
                <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{c.tagline}</p>
              </div>
            </header>

            <ul className="relative mt-5 grid gap-2 sm:grid-cols-2">
              {c.items.map((it, i) => (
                <motion.li
                  key={it.title}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 + i * 0.06 + 0.2 }}
                >
                  <Link
                    to="/client/services/new"
                    search={{ catalog: c.key, item: it.itemKey }}
                    className="group/it flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/40 p-2.5 transition hover:border-electric/40 hover:bg-background/70"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${c.gradient} text-white shadow`}>
                      <it.icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-bold text-foreground">{it.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{it.desc}</div>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>

            <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
              {c.metrics.map((m) => (
                <div key={m.label} className="text-center">
                  <div className={`text-base sm:text-lg font-black tabular-nums bg-gradient-to-br ${c.gradient} bg-clip-text text-transparent`}>{m.value}</div>
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="relative mt-4 flex items-center justify-between">
              <Link
                to="/client/services/new"
                search={{ catalog: c.key, item: c.items[0].itemKey }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-[12px] font-bold text-foreground ring-1 ring-border transition hover:bg-white/10 hover:text-electric"
              >
                اطلب هذه الخدمة
                <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1" />
              </Link>
              <Link
                to="/client/services/catalog/$catKey"
                params={{ catKey: c.key }}
                className="text-[11px] font-semibold text-muted-foreground transition hover:text-electric"
              >
                عرض كل الـ15 خدمة ←
              </Link>

            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
