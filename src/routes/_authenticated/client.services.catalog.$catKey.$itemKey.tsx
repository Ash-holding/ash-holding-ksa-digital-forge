import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft, CheckCircle2, ChevronDown, Clock, Package, Sparkles,
  ShieldCheck, Star, HelpCircle, ArrowUpRight, Calendar,
} from "lucide-react";
import {
  getCatalogItem, buildServiceDetails, formatPrice, type CatalogCategory,
} from "@/lib/services-catalog";

export const Route = createFileRoute("/_authenticated/client/services/catalog/$catKey/$itemKey")({
  head: ({ params }) => {
    const found = getCatalogItem(params.catKey, params.itemKey);
    const title = found ? `${found.item.title} — كتالوج آش` : "تفاصيل الخدمة — آش";
    const desc = found?.item.desc ?? "استعرض تفاصيل الخدمة والباقات والأسعار.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  loader: ({ params }) => {
    const found = getCatalogItem(params.catKey, params.itemKey);
    if (!found) throw notFound();
    return found;
  },
  component: ServiceDetailsPage,
});

function ServiceDetailsPage() {
  const { category, item } = Route.useLoaderData();
  const details = buildServiceDetails(item, category);
  const navigate = useNavigate();
  const Icon = item.icon;

  return (
    <div dir="rtl" className="space-y-6 p-4 md:p-6">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
        <Link to="/client/services" className="hover:text-foreground">الخدمات</Link>
        <span>/</span>
        <Link
          to="/client/services/catalog/$catKey"
          params={{ catKey: category.key }}
          className={`hover:text-foreground ${category.accent}`}
        >
          {category.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">{item.title}</span>
      </nav>

      {/* Hero */}
      <Hero category={category} item={item} Icon={Icon} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overview + Deliverables + Timeline */}
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            icon={<Sparkles className={`h-4 w-4 ${category.accent}`} />}
            eyebrow="نظرة عامة"
            title="عن هذه الخدمة"
          >
            <p className="text-[13.5px] leading-8 text-muted-foreground">{details.overview}</p>
          </SectionCard>

          <SectionCard
            icon={<Package className={`h-4 w-4 ${category.accent}`} />}
            eyebrow="التسليمات"
            title="ما ستحصل عليه"
          >
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {details.deliverables.map((d, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-[12.5px] leading-6 text-foreground"
                >
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${category.accent}`} />
                  <span>{d}</span>
                </motion.li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            icon={<Clock className={`h-4 w-4 ${category.accent}`} />}
            eyebrow="الخطة الزمنية"
            title="مراحل التنفيذ"
          >
            <ol className="relative space-y-4 border-r border-border/60 pr-6">
              {details.timeline.map((phase, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="relative"
                >
                  <span
                    className={`absolute -right-[31px] top-1 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br ${category.gradient} text-[10px] font-black text-white shadow-lg`}
                  >
                    {i + 1}
                  </span>
                  <div className="rounded-xl border border-border/60 bg-card/40 p-3.5">
                    <div className="flex items-center gap-2">
                      <Calendar className={`h-3.5 w-3.5 ${category.accent}`} />
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${category.accent}`}>
                        {phase.week}
                      </span>
                    </div>
                    <h4 className="mt-1 text-sm font-black text-foreground">{phase.title}</h4>
                    <p className="mt-1 text-[12.5px] leading-6 text-muted-foreground">{phase.desc}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </SectionCard>

          <FAQSection faq={details.faq} category={category} />
        </div>

        {/* Sidebar: Pricing + CTA */}
        <div className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className={`overflow-hidden rounded-2xl border border-border bg-card/60 p-4 ring-1 ${category.ring}/40`}>
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                ابدأ الآن
              </div>
              <div className="mt-1 text-lg font-black text-foreground">جاهز للانطلاق؟</div>
              <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
                احجز جلسة استكشاف مجانية وسنعود إليك بمقترح مخصص خلال 24 ساعة.
              </p>
              <button
                onClick={() =>
                  navigate({
                    to: "/client/services/new",
                    search: { catalog: category.key, item: item.itemKey },
                  })
                }
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${category.gradient} px-4 py-2.5 text-sm font-black text-white shadow-lg transition hover:opacity-95`}
              >
                اطلب هذه الخدمة
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                استرجاع كامل خلال 7 أيام
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                لماذا آش؟
              </div>
              <ul className="mt-2 space-y-2">
                {category.metrics.map((m: { value: string; label: string }) => (
                  <li key={m.label} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className={`font-black ${category.accent}`}>{m.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing plans */}
      <PricingSection details={details} category={category} item={item} />
    </div>
  );
}

function Hero({
  category, item, Icon,
}: {
  category: CatalogCategory;
  item: { title: string; desc: string; from?: string; highlights?: string[] };
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 md:p-8 ring-1 ${category.ring}/40 ${category.glow}`}>
      <div aria-hidden className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br ${category.gradient} opacity-20 blur-3xl`} />
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${category.gradient}`} />

      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Link
              to="/client/services/catalog/$catKey"
              params={{ catKey: category.key }}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              العودة لـ {category.title}
            </Link>
            <span className={`rounded-full bg-gradient-to-r ${category.gradient} px-2.5 py-1 text-[11px] font-black text-white`}>
              {category.eyebrow}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <motion.span
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${category.gradient} text-white shadow-xl`}
            >
              <Icon className="h-7 w-7" />
            </motion.span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black leading-tight text-foreground md:text-3xl">
                {item.title}
              </h1>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{item.desc}</p>
            </div>
            <FavoriteButton catKey={category.key} itemKey={item.itemKey} title={item.title} size="md" />
          </div>
          {item.highlights && item.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.highlights.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11.5px] font-bold text-foreground"
                >
                  <Sparkles className={`h-3 w-3 ${category.accent}`} />
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 rounded-2xl border border-border/60 bg-black/20 p-4 text-center backdrop-blur">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground">
            السعر يبدأ من
          </div>
          <div className={`mt-1 text-2xl font-black ${category.accent}`}>
            {item.from ?? "من 2,900 ر.س"}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            بدون رسوم إدارية
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon, eyebrow, title, children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground">
          {eyebrow}
        </span>
      </div>
      <h2 className="mb-3 text-lg font-black text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function PricingSection({
  details, category, item,
}: {
  details: ReturnType<typeof buildServiceDetails>;
  category: CatalogCategory;
  item: { itemKey: string };
}) {
  const navigate = useNavigate();
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-5">
      <div className="mb-1 flex items-center gap-2">
        <Star className={`h-4 w-4 ${category.accent}`} />
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground">
          الباقات والأسعار
        </span>
      </div>
      <h2 className="text-lg font-black text-foreground">اختر الباقة المناسبة</h2>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        أسعار شفافة، بدون رسوم مخفية، وإمكانية التمويل الداخلي بدون فوائد.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {details.plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className={`relative flex flex-col overflow-hidden rounded-2xl border p-5 transition ${
              plan.featured
                ? `border-transparent bg-gradient-to-br ${category.gradient} text-white shadow-2xl md:-translate-y-2`
                : "border-border bg-card/60 text-foreground"
            }`}
          >
            {plan.featured && (
              <span className="absolute left-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">
                الأكثر طلباً
              </span>
            )}
            <div className={`text-[11px] font-bold uppercase tracking-widest ${plan.featured ? "text-white/80" : "text-muted-foreground"}`}>
              {plan.name}
            </div>
            <div className={`mt-1 text-sm ${plan.featured ? "text-white/90" : "text-muted-foreground"}`}>
              {plan.tagline}
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-3xl font-black">{formatPrice(plan.price)}</span>
              <span className={`text-[12px] ${plan.featured ? "text-white/80" : "text-muted-foreground"}`}>
                {plan.unit}
              </span>
            </div>
            <ul className="mt-4 flex-1 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className={`flex items-start gap-2 text-[12.5px] leading-6 ${plan.featured ? "text-white" : "text-foreground"}`}>
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-white" : category.accent}`} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() =>
                navigate({
                  to: "/client/services/new",
                  search: {
                    catalog: category.key,
                    item: item.itemKey,
                    plan: plan.name,
                    price: plan.price,
                    duration: plan.unit.includes("شهر") ? "MONTHLY" : "ONE_TIME",
                  },
                })
              }
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                plan.featured
                  ? "bg-white text-slate-900 hover:bg-white/90"
                  : `bg-gradient-to-r ${category.gradient} text-white hover:opacity-95`
              }`}
            >
              اختر {plan.name}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FAQSection({
  faq, category,
}: {
  faq: { q: string; a: string }[];
  category: CatalogCategory;
}) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-5">
      <div className="mb-1 flex items-center gap-2">
        <HelpCircle className={`h-4 w-4 ${category.accent}`} />
        <span className="text-[10.5px] font-bold uppercase tracking-widest text-muted-foreground">
          الأسئلة الشائعة
        </span>
      </div>
      <h2 className="mb-4 text-lg font-black text-foreground">أسئلة قد تدور في ذهنك</h2>
      <div className="space-y-2">
        {faq.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className={`overflow-hidden rounded-xl border transition ${
                isOpen ? `border-transparent ring-1 ${category.ring}` : "border-border/60"
              } bg-card/40`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 p-3.5 text-right"
              >
                <span className="text-[13px] font-bold text-foreground">{f.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <motion.div
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="px-3.5 pb-3.5 text-[12.5px] leading-7 text-muted-foreground">{f.a}</p>
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
