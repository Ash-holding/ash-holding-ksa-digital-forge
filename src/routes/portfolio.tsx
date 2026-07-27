import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { ArrowLeft, Sparkles, Filter } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { PROJECTS, CATEGORIES, TONE_MAP, type ProjectCategory } from "@/lib/portfolio-data";

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: "أعمالنا ومشاريعنا | ASH HOLDING" },
      { name: "description", content: "استعرض مجموعة مختارة من مشاريع ASH HOLDING في تطوير المنصات، تطبيقات الجوال، الذكاء الاصطناعي، والحلول السحابية." },
      { property: "og:title", content: "أعمالنا ومشاريعنا | ASH HOLDING" },
      { property: "og:description", content: "دراسات حالة وأرقام حقيقية من مشاريع أنجزناها لعملاء من قطاعات مختلفة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function PortfolioVisual() {
  return (
    <div className="relative h-[380px] w-full grid place-items-center">
      <div className="absolute h-64 w-64 rounded-full bg-electric/10 blur-3xl" />
      <div className="relative grid grid-cols-3 gap-3">
        {PROJECTS.slice(0, 9).map((p, i) => {
          const t = TONE_MAP[p.tone];
          const Icon = p.icon;
          return (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring" }}
              className={`grid h-20 w-20 place-items-center rounded-2xl border ${t.border} ${t.bg} ${t.text} backdrop-blur`}
            >
              <Icon className="h-8 w-8" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PortfolioPage() {
  const [active, setActive] = useState<ProjectCategory | "all">("all");
  const filtered = useMemo(
    () => (active === "all" ? PROJECTS : PROJECTS.filter((p) => p.category === active)),
    [active]
  );

  return (
    <PageShell>
      <PageHero
        eyebrow="أعمالنا"
        title="مشاريع نفتخر"
        gradient="بتنفيذها"
        description="مجموعة مختارة من المشاريع التي أنجزناها لعملاء يمثلون قطاعات متعددة — من التجارة والتعليم إلى الصحة والبنوك — بأرقام ونتائج حقيقية."
        visual={<PortfolioVisual />}
      />

      {/* Filter chips */}
      <section className="pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>تصفية حسب المجال</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const isActive = active === c.id;
              const count = c.id === "all" ? PROJECTS.length : PROJECTS.filter((p) => p.category === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition ${
                    isActive
                      ? "bg-gradient-to-r from-electric to-purple-accent text-white border-transparent shadow-glow"
                      : "bg-card border-border text-foreground hover:border-electric/40"
                  }`}
                >
                  {c.label}
                  <span className={`text-xs rounded-full px-2 py-0.5 ${isActive ? "bg-white/20" : "bg-muted"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((p, i) => {
                const t = TONE_MAP[p.tone];
                const Icon = p.icon;
                return (
                  <motion.div
                    key={p.slug}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                  >
                    <Link
                      to="/portfolio/$slug"
                      params={{ slug: p.slug }}
                      className="group block overflow-hidden rounded-3xl border border-border bg-card hover:border-electric/40 hover:shadow-glow transition"
                    >
                      {/* Cover */}
                      <div className={`relative h-48 bg-gradient-to-br ${p.cover} overflow-hidden`}>
                        <div
                          className="absolute inset-0 opacity-10"
                          style={{
                            backgroundImage:
                              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                            backgroundSize: "24px 24px",
                          }}
                        />
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className={`absolute bottom-4 right-4 grid h-16 w-16 place-items-center rounded-2xl border ${t.border} ${t.bg} ${t.text} backdrop-blur-xl`}
                        >
                          <Icon className="h-8 w-8" />
                        </motion.div>
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="rounded-full bg-background/60 backdrop-blur px-3 py-1 text-xs font-semibold">
                            {p.year}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <div className="text-xs text-muted-foreground mb-2">{p.client}</div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-electric transition">{p.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">{p.tagline}</p>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {p.results.slice(0, 2).map((r) => (
                            <div key={r.label} className="rounded-xl bg-muted/40 px-3 py-2">
                              <div className={`text-base font-bold ${t.text}`}>{r.value}</div>
                              <div className="text-[11px] text-muted-foreground">{r.label}</div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Sparkles className="h-3 w-3" />
                            {p.stack.slice(0, 3).join(" · ")}
                          </div>
                          <ArrowLeft className="h-4 w-4 text-electric group-hover:-translate-x-1 transition" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {filtered.length === 0 && (
            <div className="text-center py-24 text-muted-foreground">لا توجد مشاريع في هذا التصنيف حالياً.</div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
