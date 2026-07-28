import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  Wallet, Sparkles, ShieldCheck, ClipboardCheck, FileSignature,
  BadgeCheck, HandCoins, Scale, Lock, ArrowLeft, LogIn,
  TrendingUp, Building2, CheckCircle2, Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DisclaimerBar } from "@/components/financing/DisclaimerBar";
import { JourneyStepper } from "@/components/financing/JourneyStepper";

import heroImg from "@/assets/financing-hero.jpg.asset.json";
import journeyImg from "@/assets/financing-journey.jpg.asset.json";
import trustImg from "@/assets/financing-trust.jpg.asset.json";
import shieldImg from "@/assets/financing-shield.jpg.asset.json";

export const Route = createFileRoute("/financing/")({
  component: FinancingHome,
  head: () => ({
    meta: [
      { title: "التمويل الداخلي — رصيد خدمي من آش القابضة" },
      { name: "description", content: "برنامج التمويل الداخلي من آش القابضة: رصيد خدمي غير نقدي داخل محفظتك يُستخدم لشراء خدمات الشركة على أقساط." },
      { property: "og:title", content: "التمويل الداخلي — آش القابضة" },
      { property: "og:description", content: "تمويل داخلي مموّل ذاتياً من آش القابضة لدعم عملائها في شراء خدمات الشركة على أقساط." },
      { property: "og:image", content: heroImg.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroImg.url },
    ],
  }),
});

type Settings = {
  productionEnabled: boolean;
  sandboxNoticeAr: string;
  minAmount: number;
  maxAmount: number;
};

function FinancingHome() {
  const reduce = useReducedMotion();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    api.get<Settings>("/financing/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const isSandbox = settings ? !settings.productionEnabled : true;

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-20 pb-20">
      {/* HERO — cinematic split with real dashboard image */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 text-white shadow-[0_40px_120px_-30px_rgba(15,23,42,0.6)] ring-1 ring-white/10">
        {/* ambient orbs */}
        <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-blue-500/25 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute -right-40 -bottom-40 h-[28rem] w-[28rem] rounded-full bg-cyan-400/15 blur-[120px]" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(34,211,238,0.12),transparent_45%)]" />

        <div className="relative z-10 grid gap-10 p-6 md:p-12 lg:grid-cols-12 lg:gap-8 lg:p-16">
          {/* copy */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <motion.div
              initial={reduce ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-blue-200 ring-1 ring-white/15 backdrop-blur"
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-blue-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              </span>
              برنامج تمويل داخلي • ممول من آش القابضة
            </motion.div>

            <motion.h1
              initial={reduce ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-4xl md:text-6xl font-black leading-[1.05] tracking-tight"
            >
              التمويل الداخلي
              <br />
              <span className="bg-gradient-to-l from-blue-300 via-cyan-200 to-white bg-clip-text text-transparent">
                لخدمات آش القابضة
              </span>
            </motion.h1>

            <motion.p
              initial={reduce ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 max-w-xl text-[15px] leading-9 text-slate-300"
            >
              رصيدٌ خدمي غير نقدي يُقيَّد في محفظتك لدى ASH لشراء خدمات الشركة على أقساط.
              مموّل ذاتياً — لا يُصرف نقداً ولا يُحوَّل خارجياً.
            </motion.p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/client/financing"
                className="group inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 shadow-[0_20px_50px_-20px_rgba(255,255,255,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_30px_60px_-25px_rgba(255,255,255,0.5)]"
              >
                <LogIn className="h-4 w-4" />
                ابدأ طلب التمويل الداخلي
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-6 py-3.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/10"
              >
                كيف يعمل البرنامج
              </a>
            </div>

            {/* KPI strip */}
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi icon={<HandCoins className="h-4 w-4" />} label="حد التمويل" value={settings ? fmt(settings.maxAmount) : "٥٠٠,٠٠٠"} suffix="ر.س كحد أقصى" />
              <Kpi icon={<Wallet className="h-4 w-4" />} label="نوع الرصيد" value="خدمي" suffix="غير نقدي" />
              <Kpi icon={<Scale className="h-4 w-4" />} label="القرار" value="بشري" suffix="لا قرارات آلية" />
              <Kpi icon={<ShieldCheck className="h-4 w-4" />} label="الحوكمة" value="متعددة" suffix="فصل صلاحيات" />
            </div>

            {isSandbox && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/30">
                <Lock className="h-3 w-3" /> برنامج داخلي — تعريفي فقط في الوقت الحالي
              </div>
            )}
          </div>

          {/* real hero image */}
          <motion.div
            initial={reduce ? {} : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-2xl">
              <img
                src={heroImg.url}
                alt="لوحة محفظة التمويل الداخلي"
                width={1600}
                height={1200}
                className="h-full w-full object-cover"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-tl from-slate-950/70 via-transparent to-transparent" />
              {/* floating stat card */}
              <motion.div
                initial={reduce ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="absolute bottom-4 right-4 rounded-2xl bg-slate-950/85 p-4 ring-1 ring-white/15 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
                    <TrendingUp className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400">الرصيد الخدمي</div>
                    <div className="text-lg font-black tabular-nums text-white">١٢٥,٠٠٠ ر.س</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {isSandbox && <DisclaimerBar />}

      {/* PILLARS */}
      <section className="grid gap-5 md:grid-cols-3">
        {[
          { icon: <Scale className="h-6 w-6" />, title: "شفافية كاملة", desc: "إفصاح مكتوب بالتكلفة الفعلية، الرسوم، الأثر عند التأخر، وحق السداد المبكر.", tone: "from-blue-500 to-cyan-500" },
          { icon: <ShieldCheck className="h-6 w-6" />, title: "حوكمة صارمة", desc: "فصل الصلاحيات بين التحليل والاعتماد، وسجل تدقيق كامل لكل خطوة.", tone: "from-emerald-500 to-teal-500" },
          { icon: <Wallet className="h-6 w-6" />, title: "رصيد خدمي فقط", desc: "لا يُصرف نقدًا. يُستخدم داخل محفظتك لدى ASH لشراء خدمات الشركة.", tone: "from-violet-500 to-fuchsia-500" },
        ].map((p, i) => (
          <motion.div
            key={i}
            initial={reduce ? {} : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.08 }}
            className="group relative overflow-hidden rounded-3xl bg-white p-7 ring-1 ring-slate-200/70 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.15)] transition hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)]"
          >
            <div aria-hidden className={`absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${p.tone} opacity-10 blur-2xl transition group-hover:opacity-20`} />
            <div className={`relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${p.tone} text-white shadow-lg`}>
              {p.icon}
            </div>
            <h3 className="relative mt-5 text-lg font-black text-slate-900">{p.title}</h3>
            <p className="relative mt-2 text-sm leading-8 text-slate-600">{p.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* HOW IT WORKS — with photo */}
      <section id="how" className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            <Sparkles className="h-3.5 w-3.5" /> الرحلة
          </div>
          <h2 className="text-3xl md:text-4xl font-black leading-tight text-slate-900">
            من الطلب <span className="text-blue-600">إلى تفعيل الرصيد</span>
          </h2>
          <p className="text-[15px] leading-9 text-slate-600">
            كل قرار يصدر عن مختصين لدى ASH — بلا قرارات آلية.
            جميع الإفصاحات والرسوم تظهر لك قبل التوقيع، وتصلك إشعارات رسمية على الواتساب في كل مرحلة.
          </p>
          <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-200 shadow-xl">
            <img
              src={journeyImg.url}
              alt="مراجعة طلب التمويل"
              width={1400}
              height={1000}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 right-4 left-4 flex items-center gap-3 rounded-2xl bg-white/95 p-3 backdrop-blur-xl ring-1 ring-white/50">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="text-xs leading-6 text-slate-700">
                <b className="text-slate-900">تدقيق يدوي بشري</b> — كل ملف يمر على محلل ائتماني معتمد قبل الاعتماد.
              </div>
            </div>
          </div>
          <Link
            to="/client/financing"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
          >
            ابدأ الطلب من بوابتك
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="lg:col-span-7">
          <JourneyStepper
            steps={[
              { title: "تقديم الطلب", desc: "اختيار المنتج، تعبئة البيانات، ورفع المستندات المطلوبة." },
              { title: "التحقق والامتثال", desc: "التحقق من الهوية والمصدر والقدرة، مع فحوصات مكافحة الاحتيال." },
              { title: "التقييم الائتماني الداخلي", desc: "نظام ائتماني داخلي خاص بآش، يُبنى على بياناتك ويُدقَّق يدوياً." },
              { title: "العرض والإفصاح", desc: "إفصاح شامل بالتكلفة، الرسوم، الجدول، والالتزامات." },
              { title: "توقيع العقد", desc: "توقيع رقمي بالبصمة وOTP، مع نسخة PDF مختومة رقميًا." },
              { title: "تفعيل الرصيد الخدمي", desc: "يُقيَّد المبلغ في محفظتك لدى ASH لشراء خدمات الشركة فقط." },
              { title: "السداد والمتابعة", desc: "أقساط واضحة وتنبيهات واتساب فورية بصيغة بنكية عند كل حركة." },
            ]}
          />
        </div>
      </section>

      {/* TRUST BANNER — real image */}
      <section className="relative overflow-hidden rounded-[2rem] ring-1 ring-slate-200 shadow-xl">
        <img
          src={trustImg.url}
          alt="مقر آش القابضة"
          width={1400}
          height={900}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-l from-slate-950/95 via-slate-950/70 to-slate-950/30" />
        <div className="relative z-10 grid gap-8 p-8 md:p-14 lg:grid-cols-2">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-blue-200 ring-1 ring-white/20 backdrop-blur">
              <Building2 className="h-3.5 w-3.5" /> جهة تمويل داخلية
            </div>
            <h2 className="mt-5 text-3xl md:text-4xl font-black leading-tight">
              نموّل عملاءنا مباشرة
              <br />
              <span className="text-blue-300">دون وسطاء ولا بنوك خارجية</span>
            </h2>
            <p className="mt-5 max-w-lg text-[15px] leading-9 text-slate-300">
              التمويل الداخلي من آش القابضة يعتمد على رأس مال الشركة، وموجّه حصراً لتمكين عملائها من الحصول على خدماتها بأريحية.
              كل عملية موثّقة وخاضعة للرقابة الداخلية ومتطلبات هيئة البيانات الوطنية.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {["ممول ذاتياً", "بيانات محلية", "توثيق كامل", "دعم مباشر 24/7"].map((t) => (
                <span key={t} className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMPLIANCE grid */}
      <section className="grid gap-5 md:grid-cols-3">
        <div className="md:col-span-2 grid gap-5 sm:grid-cols-2">
          <InfoCard
            icon={<BadgeCheck className="h-5 w-5" />}
            tone="emerald"
            title="حماية بياناتك"
            desc="نجمع الحد الأدنى الضروري من البيانات، وتُحفظ وفق سياسة الخصوصية. لك حق الاطلاع والتصحيح وإلغاء الموافقات."
          />
          <InfoCard
            icon={<FileSignature className="h-5 w-5" />}
            tone="blue"
            title="قبل التوقيع"
            desc="إفصاح كامل بمبلغ التمويل، الرسوم، إجمالي التكلفة، القسط الشهري، وجدول السداد قبل قبول العرض."
          />
          <InfoCard
            icon={<Zap className="h-5 w-5" />}
            tone="amber"
            title="تنفيذ فوري"
            desc="عند اعتماد الطلب يتم تقييد الرصيد الخدمي في محفظتك مباشرة ويمكن استخدامه فوراً لشراء الخدمات."
          />
          <InfoCard
            icon={<Scale className="h-5 w-5" />}
            tone="violet"
            title="سداد مبكر"
            desc="بإمكانك سداد التمويل مبكراً بدون رسوم إضافية، ويُخفَّض إجمالي التكلفة تلقائياً."
          />
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 ring-1 ring-white/10 text-white">
          <img
            src={shieldImg.url}
            alt=""
            width={900}
            height={900}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950" />
          <div className="relative z-10 flex h-full flex-col justify-end">
            <ShieldCheck className="h-8 w-8 text-cyan-300" />
            <h3 className="mt-3 text-xl font-black">حماية على مستوى المصارف</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              تشفير TLS، توقيع رقمي بصمة+OTP، سجلّ تدقيق كامل لكل حركة على المحفظة والعقد.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-10 md:p-16 text-center text-white ring-1 ring-white/10">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-blue-500/20 blur-[100px]" />
        <div aria-hidden className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]" />
        <div className="relative z-10 mx-auto max-w-2xl space-y-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <ClipboardCheck className="h-7 w-7 text-blue-300" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black">جاهز للتمويل الداخلي؟</h2>
          <p className="text-[15px] leading-8 text-slate-300">
            الطلب، الحاسبة، والمستندات — كلها داخل بوابة العميل الآمنة.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              to="/client/financing"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 shadow-xl transition hover:-translate-y-0.5"
            >
              <LogIn className="h-4 w-4" /> ادخل إلى بوابتك
            </Link>
            <Link
              to="/financing/disclosures"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-6 py-3.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/10"
            >
              اطلع على الإفصاحات
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/10 text-blue-200">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-base font-black text-white tabular-nums">{value}</div>
      {suffix && <div className="text-[10px] text-slate-400">{suffix}</div>}
    </div>
  );
}

function InfoCard({ icon, title, desc, tone }: { icon: React.ReactNode; title: string; desc: string; tone: "emerald" | "blue" | "amber" | "violet" }) {
  const tones = {
    emerald: "from-emerald-500 to-teal-500 text-emerald-600 bg-emerald-50 ring-emerald-100",
    blue: "from-blue-500 to-cyan-500 text-blue-600 bg-blue-50 ring-blue-100",
    amber: "from-amber-500 to-orange-500 text-amber-600 bg-amber-50 ring-amber-100",
    violet: "from-violet-500 to-fuchsia-500 text-violet-600 bg-violet-50 ring-violet-100",
  }[tone];
  const [grad, textC, bgC, ringC] = tones.split(" ");
  return (
    <div className="group rounded-3xl bg-white p-6 ring-1 ring-slate-200/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${bgC} ${textC} ring-1 ${ringC}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-base font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{desc}</p>
      <div aria-hidden className={`mt-4 h-1 w-10 rounded-full bg-gradient-to-l ${grad} opacity-70 transition group-hover:w-16`} />
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("ar-SA").format(n);
}
