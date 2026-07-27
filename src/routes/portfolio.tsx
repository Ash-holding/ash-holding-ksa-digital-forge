import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Clock, Mail } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { PROJECTS, TONE_MAP } from "@/lib/portfolio-data";

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: "أعمالنا — قريباً | ASH HOLDING" },
      { name: "description", content: "معرض أعمال ASH HOLDING قيد التجهيز. قريباً نستعرض دراسات حالة حقيقية بأرقام ونتائج لعملائنا." },
      { property: "og:title", content: "أعمالنا — قريباً | ASH HOLDING" },
      { property: "og:description", content: "معرض أعمالنا قيد التجهيز. ترقّبوا دراسات حالة ومشاريع مختارة قريباً." },
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
              animate={{ opacity: 0.55, scale: 1 }}
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
  return (
    <PageShell>
      <PageHero
        eyebrow="أعمالنا"
        title="معرض الأعمال"
        gradient="قريباً"
        description="نعمل حالياً على تجهيز معرض متكامل يستعرض دراسات حالة ومشاريع مختارة أنجزناها لعملائنا — بأرقام ونتائج حقيقية. ترقّبوا الإطلاق قريباً."
        visual={<PortfolioVisual />}
      />

      <section className="pb-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-12 text-center"
          >
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-electric/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-purple-accent/10 blur-3xl" />

            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl border border-electric/30 bg-gradient-to-br from-electric/20 to-purple-accent/20 text-electric"
              >
                <Clock className="h-10 w-10" />
              </motion.div>

              <div className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-4 py-1.5 text-xs font-semibold text-electric mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                قيد التجهيز
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                نعمل على شيء
                <span className="bg-gradient-to-r from-electric to-purple-accent bg-clip-text text-transparent"> مميّز</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
                نجهّز حالياً معرض أعمالنا بصيغة تليق بحجم المشاريع التي نفّذناها — دراسات حالة مفصّلة،
                أرقام ونتائج قابلة للقياس، والتقنيات المستخدمة في كل مشروع. سيتم إطلاق المعرض قريباً.
              </p>

              <div className="grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto mb-8 text-right">
                {[
                  { t: "دراسات حالة", d: "تحدّي، حل، نتائج" },
                  { t: "أرقام حقيقية", d: "KPIs قابلة للقياس" },
                  { t: "تقنيات مفصّلة", d: "الـ Stack الكامل" },
                ].map((f, i) => (
                  <motion.div
                    key={f.t}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="rounded-2xl border border-border bg-muted/30 p-4"
                  >
                    <div className="text-sm font-bold mb-1">{f.t}</div>
                    <div className="text-xs text-muted-foreground">{f.d}</div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-electric to-purple-accent text-white px-6 py-3 text-sm font-semibold shadow-glow hover:opacity-90 transition"
                >
                  <Mail className="h-4 w-4" />
                  اطلب عرض مشروعك
                </Link>
                <Link
                  to="/services"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:border-electric/40 transition"
                >
                  استكشف خدماتنا
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </PageShell>
  );
}
