import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Wallet, ShieldCheck, Users, LineChart, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/affiliate-program")({
  head: () => ({
    meta: [
      { title: "برنامج شركاء ASH HOLDING — اربح عمولة تنافسية" },
      { name: "description", content: "انضم إلى برنامج شركاء ASH HOLDING واحصل على عمولة تصل إلى 20% على كل إحالة ناجحة." },
      { property: "og:title", content: "برنامج شركاء ASH HOLDING" },
      { property: "og:description", content: "اربح عمولة تنافسية بتحويل عملاء لخدمات ASH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-background via-background to-amber-950/10">
      <section className="relative overflow-hidden px-6 py-20 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.15),transparent_50%)]" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center shadow-2xl shadow-amber-500/30">
            <Sparkles className="h-10 w-10 text-white" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold leading-tight">
            كن <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">شريكاً</span> واربح
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-loose">
            انضم لبرنامج شركاء ASH HOLDING واحصل على عمولة تنافسية تصل إلى <b className="text-amber-500">20%</b> على كل عميل ناجح تحوّله لخدماتنا الرقمية.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/affiliate/apply"
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl hover:opacity-90 inline-flex items-center gap-2 justify-center">
              قدّم طلب الانضمام <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link to="/affiliate"
              className="rounded-xl border border-border px-8 py-4 text-base font-bold hover:bg-muted/50 inline-flex items-center gap-2 justify-center">
              دخول بوابة المسوّق
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, title: "عمولات مغرية", desc: "احصل على نسبة تصل إلى 20% من قيمة كل عقد ناجح.", color: "from-emerald-500 to-teal-600" },
            { icon: Wallet, title: "سحب مرن", desc: "اسحب أرباحك في أي وقت عبر التحويل البنكي أو المحفظة.", color: "from-amber-500 to-orange-600" },
            { icon: ShieldCheck, title: "تتبّع شفاف", desc: "لوحة تحكم متقدمة تعرض كل نقرة وتحويل وعمولة.", color: "from-blue-500 to-indigo-600" },
            { icon: Users, title: "دعم مخصّص", desc: "فريق يدعمك بمواد تسويقية جاهزة وقوالب واتساب.", color: "from-purple-500 to-pink-600" },
            { icon: LineChart, title: "تحليلات لحظية", desc: "شاهد أداء حملاتك ومصادر عملائك في الوقت الفعلي.", color: "from-cyan-500 to-blue-600" },
            { icon: Sparkles, title: "مكافآت وحوافز", desc: "برنامج نقاط ومكافآت للشركاء الأكثر نشاطاً.", color: "from-rose-500 to-orange-500" },
          ].map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur hover:border-amber-500/30 transition"
            >
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${f.color} grid place-items-center mb-4`}>
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <div className="font-bold text-lg mb-1">{f.title}</div>
              <div className="text-sm text-muted-foreground leading-loose">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">كيف يعمل البرنامج؟</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { n: "1", t: "قدّم طلبك", d: "املأ نموذج بسيط ونراجع طلبك خلال 48 ساعة." },
              { n: "2", t: "احصل على رابطك", d: "بعد القبول، تحصل على كود ورابط إحالة مخصّص." },
              { n: "3", t: "شارك وابدأ التحويل", d: "شارك رابطك مع جمهورك عبر أي قناة." },
              { n: "4", t: "اقبض عمولتك", d: "عند نجاح الدفع، تُضاف العمولة إلى محفظتك." },
            ].map((s, i) => (
              <motion.div key={s.n}
                initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center space-y-2"
              >
                <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white font-bold text-xl shadow-lg">
                  {s.n}
                </div>
                <div className="font-bold">{s.t}</div>
                <div className="text-xs text-muted-foreground">{s.d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-10">
          <h2 className="text-3xl font-bold">جاهز للبدء؟</h2>
          <p className="text-muted-foreground">فرصتك لبناء دخل ثابت مع علامة رائدة في السوق السعودي.</p>
          <Link to="/affiliate/apply"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl">
            قدّم طلبك الآن <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
