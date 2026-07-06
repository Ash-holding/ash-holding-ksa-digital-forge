import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { SERVICES } from "@/lib/services-data";

export const Route = createFileRoute("/services/")({
  component: ServicesIndex,
  head: () => ({
    meta: [
      { title: "خدماتنا | ASH HOLDING" },
      { name: "description", content: "تعرّف على مجموعة خدمات ASH HOLDING الرقمية من تطوير ومنصات وتصميم وذكاء اصطناعي ودعم." },
    ],
  }),
});

const TONE_BG: Record<string, string> = {
  blue: "from-blue-500/15 to-blue-500/0 text-blue-500",
  cyan: "from-cyan-500/15 to-cyan-500/0 text-cyan-500",
  violet: "from-violet-500/15 to-violet-500/0 text-violet-500",
  rose: "from-rose-500/15 to-rose-500/0 text-rose-500",
  amber: "from-amber-500/15 to-amber-500/0 text-amber-500",
  indigo: "from-indigo-500/15 to-indigo-500/0 text-indigo-500",
  teal: "from-teal-500/15 to-teal-500/0 text-teal-500",
  emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-500",
};

function IndexVisual() {
  return (
    <div className="relative h-[380px] w-full grid place-items-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute h-64 w-64 rounded-full border border-dashed border-electric/30"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute h-40 w-40 rounded-full border border-dashed border-purple-accent/30"
      />
      {SERVICES.slice(0, 8).map((s, i) => {
        const angle = (i / 8) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * 140;
        const y = Math.sin(angle) * 140;
        return (
          <motion.div
            key={s.slug}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className="absolute grid h-14 w-14 place-items-center rounded-2xl bg-card border border-border shadow-card text-electric"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            <s.icon className="h-6 w-6" />
          </motion.div>
        );
      })}
      <div className="relative grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow text-xs font-black">
        ASH
      </div>
    </div>
  );
}

function ServicesIndex() {
  return (
    <PageShell>
      <PageHero
        eyebrow="خدماتنا"
        title="حلول رقمية"
        gradient="متكاملة لأعمالك"
        description="من تطوير المواقع والتطبيقات إلى الذكاء الاصطناعي والدعم المستمر — كل ما تحتاجه لبناء منتج رقمي ناجح تحت سقف واحد."
        visual={<IndexVisual />}
      />

      <section className="pb-20 md:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SERVICES.map((s, i) => (
              <motion.div
                key={s.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.08 }}
              >
                <Link
                  to="/services/$slug"
                  params={{ slug: s.slug }}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-glow"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition ${TONE_BG[s.tone]}`} />
                  <div className="relative">
                    <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${TONE_BG[s.tone]} border border-border mb-5 group-hover:scale-110 group-hover:rotate-3 transition`}>
                      <s.icon className="h-7 w-7" />
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground/60 mb-2">
                      SERVICE / 0{i + 1}
                    </div>
                    <h3 className="text-lg font-bold mb-2">{s.eyebrow}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{s.tagline}</p>
                    <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-electric">
                      اكتشف الخدمة
                      <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
