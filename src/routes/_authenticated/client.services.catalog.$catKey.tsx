import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Search, Sparkles, Zap, Shield, Rocket, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CATALOG, getCatalogCategory } from "@/lib/services-catalog";
import { FavoriteButton } from "@/components/client/FavoriteButton";

export const Route = createFileRoute("/_authenticated/client/services/catalog/$catKey")({
  head: ({ params }) => {
    const c = getCatalogCategory(params.catKey);
    const title = c ? `${c.title} — كتالوج ASH HOLDING` : "قسم الخدمات — ASH HOLDING";
    const desc = c?.tagline ?? "استكشف خدمات ASH HOLDING الاحترافية";
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
    if (!getCatalogCategory(params.catKey)) throw notFound();
    return null;
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground">القسم غير موجود.</div>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-center text-destructive">
      {error.message}
    </div>
  ),
});

function CategoryPage() {
  const { catKey } = Route.useParams();
  const navigate = useNavigate();
  const cat = getCatalogCategory(catKey)!;
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cat.items;
    return cat.items.filter(
      (it) => it.title.toLowerCase().includes(s) || it.desc.toLowerCase().includes(s),
    );
  }, [cat.items, q]);

  const Icon = cat.icon;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate({ to: "/client/services" })}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-electric hover:border-electric/40"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          كل الأقسام
        </button>
        <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {cat.eyebrow}
        </div>
      </div>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-10 ring-1 ${cat.ring} ${cat.glow}`}
      >
        <div aria-hidden className={`pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-gradient-to-br ${cat.gradient} opacity-25 blur-3xl`} />
        <div aria-hidden className={`pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-gradient-to-br ${cat.gradient} opacity-15 blur-3xl`} />

        <div className="relative grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 140, delay: 0.1 }}
            className={`grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-3xl bg-gradient-to-br ${cat.gradient} text-white shadow-2xl`}
          >
            <Icon className="h-10 w-10 sm:h-12 sm:w-12" />
          </motion.div>
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/80 ring-1 ring-white/10">
              <Sparkles className="h-3.5 w-3.5" />
              {cat.eyebrow} · {cat.items.length} خدمة
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight text-white">
              {cat.title}
            </h1>
            <p className="max-w-3xl text-sm sm:text-base leading-7 text-slate-300">{cat.intro}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { icon: Zap, t: "تسليم سريع" },
                { icon: Shield, t: "ضمان جودة" },
                { icon: Rocket, t: "دعم مستمر" },
              ].map((b) => (
                <span key={b.t} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-white/10">
                  <b.icon className={`h-3.5 w-3.5 ${cat.accent}`} /> {b.t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
          {cat.metrics.map((m) => (
            <div key={m.label} className="text-center">
              <div className={`text-xl sm:text-2xl font-black tabular-nums bg-gradient-to-br ${cat.gradient} bg-clip-text text-transparent`}>
                {m.value}
              </div>
              <div className="text-[11px] text-slate-400">{m.label}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Search + count */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[12px] text-muted-foreground">
          عرض <span className="font-bold text-foreground">{items.length}</span> من أصل{" "}
          <span className="font-bold text-foreground">{cat.items.length}</span> خدمة
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث داخل الخدمات..."
            className="w-full rounded-xl border border-border bg-card/60 py-2.5 pr-10 pl-3 text-sm text-foreground outline-none transition focus:border-electric/60 focus:ring-2 focus:ring-electric/20"
          />
        </div>
      </div>

      {/* Grid */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {items.map((it) => {
          const It = it.icon;
          return (
            <motion.article
              key={it.itemKey}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 16 } },
              }}
              whileHover={{ y: -3 }}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-4 ring-1 ${cat.ring}/40 transition hover:border-transparent ${cat.glow}`}
            >
              <div aria-hidden className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${cat.gradient} opacity-[0.10] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.25]`} />
              <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${cat.gradient} opacity-70`} />

              <div className="relative flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${cat.gradient} text-white shadow-lg`}>
                  <It className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-foreground">{it.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-muted-foreground">{it.desc}</p>
                </div>
                <FavoriteButton catKey={cat.key} itemKey={it.itemKey} title={it.title} />
              </div>

              {it.highlights && it.highlights.length > 0 && (
                <ul className="relative mt-3 space-y-1.5">
                  {it.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${cat.accent}`} />
                      <span className="truncate">{h}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                {it.from ? (
                  <div className="text-[11px] font-bold text-foreground">{it.from}</div>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/client/services/catalog/$catKey/$itemKey"
                    params={{ catKey: cat.key, itemKey: it.itemKey }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[12px] font-bold text-muted-foreground transition hover:text-foreground"
                  >
                    التفاصيل
                  </Link>
                  <Link
                    to="/client/services/new"
                    search={{ catalog: cat.key, item: it.itemKey }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[12px] font-bold text-foreground ring-1 ring-border transition hover:bg-white/10 hover:text-electric"
                  >
                    اطلب
                    <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1" />
                  </Link>
                </div>
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          لا توجد نتائج مطابقة لبحثك.
        </div>
      )}

      {/* Cross-links */}
      <div className="rounded-2xl border border-border bg-card/40 p-4">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          استكشف أقسامًا أخرى
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {CATALOG.filter((c) => c.key !== cat.key).map((c) => {
            const CI = c.icon;
            return (
              <Link
                key={c.key}
                to="/client/services/catalog/$catKey"
                params={{ catKey: c.key }}
                className={`group flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3 transition hover:border-electric/40`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${c.gradient} text-white`}>
                  <CI className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-foreground">{c.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{c.items.length} خدمة</div>
                </div>
                <ArrowLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-electric" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
