import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Scale, MessageCircleWarning, ShieldCheck, BookOpen, LineChart } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/financing/disclosures")({
  component: DisclosuresPage,
  head: () => ({
    meta: [
      { title: "الإفصاحات والحوكمة — تمويل خدمات ASH" },
      { name: "description", content: "الإفصاحات الرسمية وسياسة الشكاوى ولوائح الحوكمة لبرنامج تمويل خدمات آش القابضة." },
      { property: "og:title", content: "الإفصاحات والحوكمة — تمويل خدمات ASH" },
      { property: "og:description", content: "الإفصاحات الرسمية وسياسة الشكاوى ولوائح الحوكمة لبرنامج تمويل خدمات آش القابضة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Disclosure = {
  id: string; slug: string; titleAr: string;
  category: "RATE_SHEET" | "TERMS" | "COMPLAINTS" | "GOVERNANCE" | "SAMA_NOTICE" | "REPORT";
  summaryAr?: string | null;
  effectiveAt?: string | null; publishedAt?: string | null;
  documentPath?: string | null;
};

const CATEGORY_META: Record<Disclosure["category"], { label: string; icon: typeof FileText; color: string }> = {
  RATE_SHEET: { label: "قوائم الأسعار والرسوم", icon: LineChart, color: "text-electric" },
  TERMS: { label: "الشروط والأحكام", icon: BookOpen, color: "text-sky-400" },
  COMPLAINTS: { label: "سياسة الشكاوى", icon: MessageCircleWarning, color: "text-amber-400" },
  GOVERNANCE: { label: "الحوكمة", icon: Scale, color: "text-violet-400" },
  SAMA_NOTICE: { label: "إشعارات ساما", icon: ShieldCheck, color: "text-emerald-400" },
  REPORT: { label: "التقارير الدورية", icon: FileText, color: "text-slate-300" },
};

function DisclosuresPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-disclosures"],
    queryFn: () => api.get<{ disclosures: Disclosure[] }>(`/financing/disclosures`).then((r) => r.data.disclosures),
  });

  const grouped = (data ?? []).reduce<Record<string, Disclosure[]>>((acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.15),transparent_50%)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-16">
          <motion.h1
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-black tracking-tight"
          >
            الإفصاحات والحوكمة
          </motion.h1>
          <p className="mt-3 text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
            جميع الإفصاحات الرسمية لبرنامج «تمويل خدمات ASH»: قوائم الأسعار، سياسات الشكاوى،
            لوائح الحوكمة، والتقارير الدورية بشفافية تامة وفق أفضل الممارسات.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-400">
            لم يتم نشر أي إفصاحات بعد. عند اعتماد المنشورات النظامية ستظهر هنا مباشرة.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([cat, items]) => {
              const meta = CATEGORY_META[cat as Disclosure["category"]];
              const Icon = meta.icon;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                    <h2 className="text-lg font-bold">{meta.label}</h2>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {items.map((d) => (
                      <motion.article
                        key={d.id}
                        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-5 hover:border-white/25 transition"
                      >
                        <h3 className="font-bold text-base mb-2 group-hover:text-electric transition">{d.titleAr}</h3>
                        {d.summaryAr && <p className="text-xs text-slate-300 leading-relaxed mb-3">{d.summaryAr}</p>}
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {d.effectiveAt ? `يسري من: ${new Date(d.effectiveAt).toLocaleDateString("ar-SA")}` : (d.publishedAt ? `نُشر: ${new Date(d.publishedAt).toLocaleDateString("ar-SA")}` : "")}
                          </span>
                          {d.documentPath && (
                            <a href={d.documentPath} target="_blank" rel="noreferrer" className="text-electric hover:underline">
                              تحميل المستند
                            </a>
                          )}
                        </div>
                      </motion.article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 text-xs text-amber-200/90 leading-relaxed">
          للتواصل بخصوص أي شكوى أو استفسار نظامي متعلق بالتمويل، يرجى مراسلتنا عبر البريد الرسمي المخصص للشكاوى
          خلال أيام العمل، وسيتم الرد خلال 5 أيام عمل كحد أقصى.
        </div>
      </section>
    </div>
  );
}
