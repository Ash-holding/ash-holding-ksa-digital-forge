import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/financing")({
  head: () => ({
    meta: [
      { title: "تمويل خدمات ASH — رصيد خدمي داخلي (بيئة تجريبية)" },
      { name: "description", content: "تعرف على تمويل خدمات ASH: رصيد داخلي غير نقدي لشراء خدمات الشركة، بحدود واضحة وشفافية كاملة." },
      { property: "og:title", content: "تمويل خدمات ASH" },
      { property: "og:description", content: "رصيد خدمي داخلي (٥,٠٠٠ — ٥٠٠,٠٠٠ ريال) لشراء خدمات ASH فقط. النظام في بيئة تجريبية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: FinancingLayout,
});

function FinancingLayout() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <Header />
      <main className="pt-24 pb-20">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
