import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { SERVICES, SERVICE_MAP, type ServiceItem } from "@/lib/services-data";

export const Route = createFileRoute("/services/$slug")({
  component: ServiceDetail,
  loader: ({ params }) => {
    const svc = SERVICE_MAP[params.slug];
    if (!svc) throw notFound();
    return { svc };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.svc.eyebrow} | ASH HOLDING` },
          { name: "description", content: loaderData.svc.description },
        ]
      : [{ title: "خدمة | ASH HOLDING" }],
  }),
  notFoundComponent: () => (
    <PageShell>
      <div className="min-h-[60vh] grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-3xl font-bold mb-3">الخدمة غير موجودة</h1>
          <Link to="/services" className="text-electric font-semibold">← عرض كل الخدمات</Link>
        </div>
      </div>
    </PageShell>
  ),
  errorComponent: ({ reset }) => (
    <PageShell>
      <div className="min-h-[60vh] grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-3">حدث خطأ ما</h1>
          <button onClick={() => reset()} className="text-electric font-semibold">إعادة المحاولة</button>
        </div>
      </div>
    </PageShell>
  ),
});

const TONE: Record<string, { grad: string; text: string; bg: string; ring: string }> = {
  blue: { grad: "from-blue-500 to-cyan-500", text: "text-blue-500", bg: "bg-blue-500/10", ring: "ring-blue-500/20" },
  cyan: { grad: "from-cyan-500 to-teal-500", text: "text-cyan-500", bg: "bg-cyan-500/10", ring: "ring-cyan-500/20" },
  violet: { grad: "from-violet-500 to-fuchsia-500", text: "text-violet-500", bg: "bg-violet-500/10", ring: "ring-violet-500/20" },
  rose: { grad: "from-rose-500 to-pink-500", text: "text-rose-500", bg: "bg-rose-500/10", ring: "ring-rose-500/20" },
  amber: { grad: "from-amber-500 to-orange-500", text: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
  indigo: { grad: "from-indigo-500 to-blue-500", text: "text-indigo-500", bg: "bg-indigo-500/10", ring: "ring-indigo-500/20" },
  teal: { grad: "from-teal-500 to-emerald-500", text: "text-teal-500", bg: "bg-teal-500/10", ring: "ring-teal-500/20" },
  emerald: { grad: "from-emerald-500 to-green-500", text: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
};

function ServiceVisual({ svc }: { svc: ServiceItem }) {
  const tone = TONE[svc.tone];
  const Icon = svc.icon;
  return (
    <div className="relative h-[380px] w-full grid place-items-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.7 }}
          className={`absolute h-56 w-56 rounded-full ${tone.bg}`}
        />
      ))}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute h-72 w-72 rounded-full border border-dashed border-border"
      />
      {svc.stack.slice(0, 6).map((tech, i) => {
        const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * 160;
        const y = Math.sin(angle) * 160;
        return (
          <motion.div
            key={tech}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="absolute rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-card whitespace-nowrap"
            style={{ transform: `translate(${x}px, ${y}px)` }}
          >
            {tech}
          </motion.div>
        );
      })}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", delay: 0.1 }}
        className={`relative grid h-28 w-28 place-items-center rounded-3xl bg-gradient-to-br ${tone.grad} text-white shadow-glow`}
      >
        <Icon className="h-12 w-12" />
      </motion.div>
    </div>
  );
}

function ServiceDetail() {
  const { svc } = Route.useLoaderData();
  const tone = TONE[svc.tone];
  const otherServices = SERVICES.filter((s) => s.slug !== svc.slug).slice(0, 3);

  return (
    <PageShell>
      <PageHero
        eyebrow={svc.eyebrow}
        title={svc.title}
        gradient={svc.gradient}
        description={svc.description}
        visual={<ServiceVisual svc={svc} />}
      />

      {/* Stats */}
      <section className="pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {svc.stats.map((st, i) => (
              <motion.div
                key={st.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card ring-1 ${tone.ring}`}
              >
                <div className={`text-xl md:text-2xl font-black ${tone.text}`}>{st.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">{st.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="text-center mb-10 md:mb-14">
            <div className={`inline-flex items-center gap-2 rounded-full ${tone.bg} ${tone.text} px-3 py-1 text-xs font-semibold mb-3`}>
              <Sparkles className="h-3.5 w-3.5" />
              ما نقدمه
            </div>
            <h2 className="text-2xl md:text-4xl font-bold">
              مميزات <span className={`bg-gradient-to-r ${tone.grad} bg-clip-text text-transparent`}>{svc.eyebrow}</span>
            </h2>
          </div>
          <div className="grid gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {svc.features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.08 }}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 md:p-6 shadow-card hover:-translate-y-1 hover:shadow-glow transition-all"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.grad} opacity-0 group-hover:opacity-100 transition`} />
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${tone.bg} ${tone.text} mb-4 group-hover:rotate-6 group-hover:scale-110 transition`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack + Process */}
      <section className="pb-16 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 grid gap-8 lg:grid-cols-2">
          {/* Stack */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-card"
          >
            <h3 className="text-xl md:text-2xl font-bold mb-2">التقنيات المستخدمة</h3>
            <p className="text-sm text-muted-foreground mb-6">أدوات معتمدة عالمياً نستخدمها لبناء حلول موثوقة.</p>
            <div className="flex flex-wrap gap-2">
              {svc.stack.map((t, i) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-full ${tone.bg} ${tone.text} px-4 py-1.5 text-sm font-semibold ring-1 ${tone.ring}`}
                >
                  {t}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Process */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-card"
          >
            <h3 className="text-xl md:text-2xl font-bold mb-2">آلية التنفيذ</h3>
            <p className="text-sm text-muted-foreground mb-6">خطوات واضحة من الفكرة إلى الإطلاق.</p>
            <div className="space-y-3">
              {svc.process.map((p, i) => (
                <div key={p.t} className="flex items-start gap-3">
                  <div className={`shrink-0 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${tone.grad} text-white text-sm font-black`}>
                    0{i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold">{p.t}</div>
                    <div className="text-sm text-muted-foreground">{p.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${tone.grad} p-8 md:p-12 text-white shadow-glow`}
          >
            <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="relative grid md:grid-cols-[1fr_auto] items-center gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-3">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  جاهزون للانطلاق
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-2">
                  ابدأ مشروع {svc.eyebrow} الآن
                </h3>
                <p className="text-white/80">تواصل معنا للحصول على استشارة مجانية وعرض سعر خلال 24 ساعة.</p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-foreground hover:opacity-95 transition">
                  اطلب استشارة
                </Link>
                <Link to="/services" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20 transition">
                  <ArrowLeft className="h-4 w-4" />
                  كل الخدمات
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Related */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h3 className="text-xl md:text-2xl font-bold">خدمات ذات صلة</h3>
            <Link to="/services" className="text-sm font-semibold text-electric shrink-0">عرض الكل ←</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((o) => {
              const ot = TONE[o.tone];
              return (
                <Link
                  key={o.slug}
                  to="/services/$slug"
                  params={{ slug: o.slug }}
                  className="group rounded-3xl border border-border bg-card p-5 shadow-card hover:-translate-y-1 hover:shadow-glow transition"
                >
                  <div className={`grid h-11 w-11 place-items-center rounded-2xl ${ot.bg} ${ot.text} mb-3 group-hover:scale-110 transition`}>
                    <o.icon className="h-5 w-5" />
                  </div>
                  <div className="font-bold mb-1">{o.eyebrow}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{o.tagline}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
