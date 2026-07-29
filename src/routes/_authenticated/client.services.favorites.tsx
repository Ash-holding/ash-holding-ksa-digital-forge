import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Sparkles, Trash2, Package } from "lucide-react";
import { useMemo } from "react";
import { useFavorites } from "@/lib/service-favorites";
import { getCatalogItem } from "@/lib/services-catalog";
import { PageHeader } from "@/components/dashboard/AdminLayout";

export const Route = createFileRoute("/_authenticated/client/services/favorites")({
  head: () => ({
    meta: [
      { title: "خدماتي المفضلة — آش القابضة" },
      { name: "description", content: "استعرض الخدمات التي حفظتها لاستكمال طلبها لاحقاً." },
      { property: "og:title", content: "خدماتي المفضلة — آش القابضة" },
      { property: "og:description", content: "قائمة سريعة بالخدمات المحفوظة لديك." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { items, remove, clear, count } = useFavorites();

  const resolved = useMemo(
    () =>
      items
        .map((f) => {
          const found = getCatalogItem(f.catKey, f.itemKey);
          if (!found) return null;
          return { ...f, ...found };
        })
        .filter(Boolean) as Array<
        ReturnType<typeof getCatalogItem> & { catKey: string; itemKey: string; addedAt: number }
      >,
    [items],
  );

  return (
    <div dir="rtl" className="space-y-5 p-4 md:p-6">
      <PageHeader
        icon={Heart}
        title="خدماتي المفضلة"
        description="سجل خاص بالخدمات التي حفظتها — استعِد اختياراتك بسرعة قبل إرسال الطلب."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] font-bold text-rose-400">
              <Heart className="h-3 w-3 fill-current" /> {count} خدمة
            </span>
            {count > 0 && (
              <button
                onClick={() => clear()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/70 px-3 py-1.5 text-[11.5px] font-bold text-muted-foreground transition hover:text-rose-400 hover:border-rose-500/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> إفراغ القائمة
              </button>
            )}
          </div>
        }
      />

      {resolved.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-rose-500/10 text-rose-400">
            <Heart className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-black text-foreground">لا توجد خدمات مفضلة بعد</h3>
          <p className="mt-1 max-w-md text-[12px] text-muted-foreground">
            تصفّح كتالوج الخدمات واضغط على أيقونة القلب لحفظ الخدمات التي تهمّك واستعادتها لاحقاً.
          </p>
          <Link
            to="/client/services"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-electric to-purple-accent px-4 py-2 text-[12px] font-bold text-white"
          >
            استكشف الكتالوج <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence>
            {resolved.map((r) => {
              const cat = r.category;
              const it = r.item;
              const It = it.icon;
              return (
                <motion.article
                  key={`${r.catKey}:${r.itemKey}`}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    show: { opacity: 1, y: 0 },
                  }}
                  exit={{ opacity: 0, scale: 0.94 }}
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
                      <div className="flex items-center gap-1.5">
                        <Package className={`h-3 w-3 ${cat.accent}`} />
                        <span className="text-[10.5px] font-bold text-muted-foreground">{cat.title}</span>
                      </div>
                      <h3 className="mt-0.5 truncate text-sm font-black text-foreground">{it.title}</h3>
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-muted-foreground">{it.desc}</p>
                    </div>
                    <button
                      onClick={() => remove(r.catKey, r.itemKey)}
                      aria-label="إزالة من المفضلة"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-400 transition hover:bg-rose-500/20"
                    >
                      <Heart className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </div>

                  <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    {it.from ? (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                        <Sparkles className={`h-3 w-3 ${cat.accent}`} /> {it.from}
                      </div>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-1.5">
                      <Link
                        to="/client/services/catalog/$catKey/$itemKey"
                        params={{ catKey: r.catKey, itemKey: r.itemKey }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[12px] font-bold text-muted-foreground transition hover:text-foreground"
                      >
                        التفاصيل
                      </Link>
                      <Link
                        to="/client/services/new"
                        search={{ catalog: r.catKey, item: r.itemKey }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[12px] font-bold text-foreground ring-1 ring-border transition hover:bg-white/10 hover:text-electric"
                      >
                        اطلب <ArrowLeft className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
