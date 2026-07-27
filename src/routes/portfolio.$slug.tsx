import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, CheckCircle2, Target, Lightbulb, TrendingUp, Layers } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { PROJECTS, TONE_MAP } from "@/lib/portfolio-data";

export const Route = createFileRoute("/portfolio/$slug")({
  component: ProjectDetail,
  loader: ({ params }) => {
    const project = PROJECTS.find((p) => p.slug === params.slug);
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "المشروع غير موجود" }, { name: "robots", content: "noindex" }] };
    }
    const { project } = loaderData;
    return {
      meta: [
        { title: `${project.title} | أعمال ASH HOLDING` },
        { name: "description", content: project.summary },
        { property: "og:title", content: `${project.title} — ASH HOLDING` },
        { property: "og:description", content: project.tagline },
        { property: "og:type", content: "article" },
      ],
    };
  },
  notFoundComponent: () => (
    <PageShell>
      <div className="py-40 text-center">
        <h1 className="text-3xl font-bold mb-4">المشروع غير موجود</h1>
        <Link to="/portfolio" className="text-electric hover:underline">العودة إلى المشاريع</Link>
      </div>
    </PageShell>
  ),
});

function ProjectDetail() {
  const { project } = Route.useLoaderData();
  const t = TONE_MAP[project.tone];
  const Icon = project.icon;

  return (
    <PageShell>
      {/* Hero */}
      <section className={`relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-to-br ${project.cover}`}>
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Link to="/" className="hover:text-electric transition">الرئيسية</Link>
            <span>/</span>
            <Link to="/portfolio" className="hover:text-electric transition">أعمالنا</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{project.title}</span>
          </motion.div>

          <div className="grid gap-10 lg:grid-cols-3 items-center">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`inline-flex items-center gap-2 rounded-full border ${t.border} ${t.bg} ${t.text} px-3 py-1 text-xs font-semibold mb-5`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                {project.client} · {project.year}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-5"
              >
                {project.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl"
              >
                {project.summary}
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`justify-self-center grid h-40 w-40 place-items-center rounded-3xl border ${t.border} ${t.bg} ${t.text} backdrop-blur-xl shadow-glow`}
            >
              <Icon className="h-20 w-20" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {project.results.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6 hover:shadow-glow hover:border-electric/40 transition"
              >
                <div className={`text-3xl md:text-4xl font-extrabold ${t.text} mb-1`}>{r.value}</div>
                <div className="text-sm text-muted-foreground">{r.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Challenge + Solution */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 grid gap-6 lg:grid-cols-2">
          {[
            { icon: Target, title: "التحدي", body: project.challenge, color: "rose" },
            { icon: Lightbulb, title: "الحل", body: project.solution, color: "electric" },
          ].map((b, i) => {
            const BIcon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl border border-border bg-card p-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl ${b.color === "rose" ? "bg-rose-500/10 text-rose-500" : "bg-electric/10 text-electric"}`}>
                    <BIcon className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold">{b.title}</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">{b.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Scope + Stack */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 grid gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border bg-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-electric/10 text-electric">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">المدة</h3>
            </div>
            <div className={`text-4xl font-extrabold ${t.text}`}>{project.duration}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-border bg-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-electric/10 text-electric">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">نطاق العمل</h3>
            </div>
            <ul className="space-y-2">
              {project.scope.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-electric" />
                  {s}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl border border-border bg-card p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-electric/10 text-electric">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">التقنيات</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.stack.map((s) => (
                <span key={s} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-electric/10 via-purple-accent/5 to-transparent p-10 text-center"
          >
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-electric/20 blur-3xl" />
            <h2 className="relative text-3xl md:text-4xl font-extrabold mb-4">لديك مشروع مشابه؟</h2>
            <p className="relative text-muted-foreground mb-8 max-w-xl mx-auto">
              نجاح هذا المشروع لم يأتِ صدفة. تواصل معنا لنبني معك قصة نجاح مماثلة.
            </p>
            <div className="relative flex flex-wrap justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-electric to-purple-accent text-white px-6 py-3 font-bold shadow-glow hover:scale-105 transition"
              >
                ابدأ مشروعك
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-bold hover:border-electric/40 transition"
              >
                مشاريع أخرى
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </PageShell>
  );
}
