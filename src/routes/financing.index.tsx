import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  Wallet, Sparkles, ShieldCheck, ClipboardCheck, FileSignature,
  BadgeCheck, HandCoins, Scale, Lock, ArrowLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DisclaimerBar } from "@/components/financing/DisclaimerBar";
import { JourneyStepper } from "@/components/financing/JourneyStepper";
import { FinancingCalculator } from "@/components/financing/Calculator";

export const Route = createFileRoute("/financing/")({
  component: FinancingHome,
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
    <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-16">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-8 md:p-14 text-white shadow-2xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
        />
        <div className="relative z-10 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            {isSandbox && (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
                <Lock className="h-3 w-3" /> بيئة تجريبية — لا تُصدر التزامات مالية
              </span>
            )}
            <motion.h1
              initial={reduce ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-3xl md:text-5xl font-black leading-tight"
            >
              تمويل خدمات <span className="text-blue-300">ASH</span>
            </motion.h1>
            <motion.p
              initial={reduce ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 max-w-xl text-base leading-8 text-slate-300"
            >
              رصيد <b className="text-white">خدمي داخلي</b> يُقيَّد في محفظتك لدى ASH لشراء خدمات الشركة فقط،
              ويُسدَّد على أقساط متفق عليها. <b className="text-white">لا يُصرف نقدًا</b> ولا يمكن تحويله لأي جهة أخرى.
            </motion.p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              <Kpi icon={<HandCoins className="h-4 w-4" />} label="حد التمويل" value={
                settings ? `${fmt(settings.minAmount)} — ${fmt(settings.maxAmount)}` : "٥,٠٠٠ — ٥٠٠,٠٠٠"
              } suffix="ريال" />
              <Kpi icon={<Wallet className="h-4 w-4" />} label="نوع الرصيد" value="خدمي" suffix="غير نقدي" />
              <Kpi icon={<Scale className="h-4 w-4" />} label="القرار" value="بشري" suffix="بلا قرارات آلية" />
              <Kpi icon={<ShieldCheck className="h-4 w-4" />} label="الحوكمة" value="متعددة الطبقات" suffix="فصل الصلاحيات" />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#calculator"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100"
              >
                جرّب الحاسبة <ArrowLeft className="h-4 w-4" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
              >
                كيف يعمل
              </a>
            </div>
          </div>

          <motion.div
            initial={reduce ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-300">محفظة خدمات ASH</div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                عرض تجريبي
              </span>
            </div>
            <div className="mt-6">
              <div className="text-xs text-slate-400">الرصيد الخدمي المتاح</div>
              <div className="mt-1 text-4xl font-black tabular-nums">١٢٥,٠٠٠ ر.س</div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              <MiniStat label="مبلغ التمويل" value="١٥٠,٠٠٠" />
              <MiniStat label="القسط الشهري" value="٦,٧٥٠" />
              <MiniStat label="عدد الأقساط" value="٢٤" />
              <MiniStat label="المدفوع" value="٢٥,٠٠٠" />
            </div>
          </motion.div>
        </div>
      </section>

      {isSandbox && <DisclaimerBar />}

      {/* HOW IT WORKS */}
      <section id="how" className="grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            <Sparkles className="h-3 w-3" /> الرحلة
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">من الطلب إلى تفعيل الرصيد</h2>
          <p className="text-sm leading-8 text-slate-600">
            رحلة واضحة وشفافة — كل قرار يصدر عن مختصين لدى ASH، ولا تعتمد على أي قرار آلي.
            جميع الإفصاحات والرسوم تظهر لك قبل التوقيع.
          </p>
        </div>
        <div className="lg:col-span-3">
          <JourneyStepper
            steps={[
              { title: "تقديم الطلب", desc: "اختيار المنتج، تعبئة البيانات، ورفع المستندات المطلوبة.", done: true },
              { title: "التحقق والامتثال", desc: "التحقق من الهوية والمصدر والقدرة، مع فحوصات مكافحة الاحتيال." },
              { title: "الدراسة الائتمانية", desc: "مراجعة بشرية من فريق الائتمان — لا قرارات آلية.", active: true },
              { title: "العرض والإفصاح", desc: "إفصاح شامل بالتكلفة، الرسوم، الجدول، والالتزامات." },
              { title: "توقيع العقد", desc: "توقيع رقمي بالبصمة وOTP، مع نسخة PDF مختومة رقميًا." },
              { title: "تفعيل الرصيد الخدمي", desc: "يُقيَّد المبلغ في محفظتك لدى ASH لشراء خدمات الشركة فقط." },
              { title: "السداد والمتابعة", desc: "أقساط واضحة وتنبيهات واتساب فورية عند كل حركة." },
            ]}
          />
        </div>
      </section>

      {/* PILLARS */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: <Scale className="h-5 w-5" />, title: "شفافية كاملة", desc: "إفصاح مكتوب بالتكلفة الفعلية، الرسوم، الأثر عند التأخر، وحق السداد المبكر." },
          { icon: <ShieldCheck className="h-5 w-5" />, title: "حوكمة صارمة", desc: "فصل الصلاحيات بين التحليل والاعتماد، وسجل تدقيق كامل لكل خطوة." },
          { icon: <Wallet className="h-5 w-5" />, title: "رصيد خدمي فقط", desc: "لا يُصرف نقدًا. يُستخدم داخل محفظتك لدى ASH لشراء خدمات الشركة." },
        ].map((p, i) => (
          <motion.div
            key={i}
            initial={reduce ? {} : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.05 }}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white">{p.icon}</div>
            <h3 className="mt-4 text-base font-bold text-slate-900">{p.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{p.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* CALCULATOR */}
      <section id="calculator" className="space-y-6 scroll-mt-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            <ClipboardCheck className="h-3 w-3" /> حاسبة الأقساط
          </div>
          <h2 className="mt-2 text-2xl md:text-3xl font-black text-slate-900">احسب قسطك التقديري</h2>
          <p className="mt-2 text-sm text-slate-600">الحساب يتم على الخادم بالكامل — لا يخزّن أي بيانات شخصية.</p>
        </div>
        <FinancingCalculator />
      </section>

      {/* COMPLIANCE / FAQ TEASER */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100">
          <BadgeCheck className="h-6 w-6 text-emerald-600" />
          <h3 className="mt-3 text-lg font-bold text-slate-900">حماية بياناتك</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            نجمع الحد الأدنى الضروري من البيانات، ونحفظها وفق سياسة الخصوصية.
            لك الحق في الاطلاع والتصحيح وإلغاء الموافقات وفقًا للأنظمة السارية.
          </p>
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-100">
          <FileSignature className="h-6 w-6 text-blue-600" />
          <h3 className="mt-3 text-lg font-bold text-slate-900">قبل التوقيع</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            يظهر لك إفصاح مكتوب يوضح: مبلغ التمويل، الرسوم، إجمالي التكلفة، القسط الشهري،
            جدول السداد، الأثر عند التأخر، وإجراءات السداد المبكر — قبل قبول العرض.
          </p>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-[11px] text-slate-300">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/10">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-white">{value}</div>
      {suffix && <div className="text-[10px] text-slate-400">{suffix}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold tabular-nums text-white">{value}</div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("ar-SA").format(n);
}
