import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Menu, X, ChevronDown, LogIn, Home, Info, Sparkles, Workflow, HelpCircle, Phone, LifeBuoy,
  Code2, Smartphone, LayoutDashboard, Brain, Palette, GraduationCap, Plug, Wrench,
  Server, Cpu, Database, Settings2, Mail, ShieldCheck, HardDrive,
  Search, Target, FileText, Image as ImageIcon, MousePointerClick, BarChart3, User,
} from "lucide-react";

type IconTone = "blue" | "cyan" | "violet" | "emerald" | "amber" | "rose" | "indigo" | "teal";
type MegaItem = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  href: string;
  tone: IconTone;
};
type NavItem = { label: string; href?: string; items?: MegaItem[] };

const TONE: Record<IconTone, string> = {
  blue: "bg-blue-50 text-blue-600",
  cyan: "bg-cyan-50 text-cyan-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  indigo: "bg-indigo-50 text-indigo-600",
  teal: "bg-teal-50 text-teal-600",
};

const NAV: NavItem[] = [
  { label: "الرئيسية", href: "#home" },
  { label: "أعمالنا", href: "/portfolio" },
  {
    label: "الشركة",
    items: [
      { icon: Info, title: "من نحن", desc: "تعرف على ASH HOLDING ورؤيتنا في بناء الحلول الرقمية.", href: "/about", tone: "blue" },
      { icon: Sparkles, title: "لماذا ASH", desc: "منهجية واضحة، تنفيذ احترافي، ودعم بعد الإطلاق.", href: "/why", tone: "violet" },
      { icon: Workflow, title: "آلية العمل", desc: "خطوات منظمة من التحليل إلى التسليم.", href: "/process", tone: "cyan" },
      { icon: HelpCircle, title: "الأسئلة الشائعة", desc: "إجابات واضحة حول الخدمات، العقود، والدعم.", href: "/faq", tone: "amber" },
      { icon: Phone, title: "تواصل معنا", desc: "ابدأ مشروعك أو اطلب استشارة.", href: "/contact", tone: "emerald" },
      { icon: LifeBuoy, title: "الدعم", desc: "الوصول إلى فريق الدعم ومتابعة الطلبات.", href: "/support", tone: "rose" },
    ],
  },
  {
    label: "الخدمات",
    items: [
      { icon: Code2, title: "تطوير المواقع والمنصات", desc: "مواقع تعريفية، بوابات أعمال، ومتاجر إلكترونية مخصصة.", href: "/services/web", tone: "blue" },
      { icon: Smartphone, title: "تطبيقات الجوال", desc: "تطبيقات iOS و Android بتجربة استخدام متقدمة.", href: "/services/mobile", tone: "cyan" },
      { icon: LayoutDashboard, title: "الأنظمة ولوحات التحكم", desc: "أنظمة إدارية، صلاحيات، تقارير، وفواتير.", href: "/services/systems", tone: "indigo" },
      { icon: Brain, title: "الذكاء الاصطناعي والأتمتة", desc: "حلول ذكية لتسريع التشغيل وتحسين الإنتاجية.", href: "/services/ai", tone: "violet" },
      { icon: Palette, title: "التصميم والهوية", desc: "UI/UX، هوية بصرية، وصفحات هبوط.", href: "/services/design", tone: "rose" },
      
      { icon: Plug, title: "التكاملات البرمجية", desc: "ربط API، بوابات دفع، SMS، بريد، وأنظمة خارجية.", href: "/services/integrations", tone: "teal" },
      { icon: Wrench, title: "الدعم والتشغيل", desc: "صيانة، تحديثات، مراقبة، وتحسين مستمر.", href: "/services/support-ops", tone: "emerald" },
    ],
  },
  {
    label: "الاستضافة والسيرفرات",
    items: [
      { icon: Server, title: "الاستضافة المشتركة", desc: "استضافة اقتصادية للمواقع الصغيرة والمتوسطة.", href: "#hosting", tone: "blue" },
      { icon: Cpu, title: "VPS", desc: "خوادم افتراضية مرنة للمشاريع المتنامية.", href: "#hosting", tone: "violet" },
      { icon: HardDrive, title: "السيرفرات المخصصة", desc: "أداء عالي وتحكم كامل للمشاريع الكبيرة.", href: "#hosting", tone: "indigo" },
      { icon: Settings2, title: "إدارة السيرفرات", desc: "إعداد Linux و Nginx وقواعد البيانات والحماية.", href: "#hosting", tone: "cyan" },
      { icon: Mail, title: "SMTP والبريد", desc: "إعداد بريد احترافي وإرسال موثوق.", href: "#hosting", tone: "emerald" },
      { icon: Database, title: "قواعد البيانات", desc: "PostgreSQL و MySQL مع نسخ احتياطي ومراقبة.", href: "#hosting", tone: "teal" },
      { icon: ShieldCheck, title: "الحماية والمراقبة", desc: "مراقبة الأداء، SSL، Firewall، وتنبيهات.", href: "#hosting", tone: "rose" },
    ],
  },
  {
    label: "التسويق الرقمي",
    items: [
      { icon: Search, title: "تحسين محركات البحث SEO", desc: "رفع ظهور الموقع وتحسين البنية والمحتوى.", href: "#marketing", tone: "blue" },
      { icon: Target, title: "الحملات الإعلانية", desc: "إدارة إعلانات Google و Meta باحتراف.", href: "#marketing", tone: "rose" },
      { icon: FileText, title: "إدارة المحتوى", desc: "كتابة محتوى، صفحات، ورسائل تسويقية.", href: "#marketing", tone: "amber" },
      { icon: ImageIcon, title: "الهوية البصرية", desc: "بناء هوية متناسقة للشركة أو المنتج.", href: "#marketing", tone: "violet" },
      { icon: MousePointerClick, title: "صفحات الهبوط", desc: "صفحات مصممة للتحويل وقياس النتائج.", href: "#marketing", tone: "cyan" },
      { icon: BarChart3, title: "التقارير والتحليلات", desc: "تتبع الأداء وتحسين القرارات التسويقية.", href: "#marketing", tone: "teal" },
    ],
  },
  { label: "حسابي", href: "#portal" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openMenu = (label: string) => {
    cancelClose();
    setActiveMega(label);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setActiveMega(null), 200);
  };

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveMega(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("keydown", onKey);
      cancelClose();
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-soft" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-20 md:px-8">
        <a href="#home" className="flex items-center gap-2 shrink-0">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand shadow-glow">
            <span className="text-sm font-bold text-primary-foreground">A</span>
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-sm font-bold tracking-tight">ASH HOLDING</div>
            <div className="text-[10px] text-muted-foreground">شركة علي صالح الشهري القابضة</div>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => {
            const isActive = activeMega === item.label;
            if (!item.items) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onMouseEnter={scheduleClose.bind(null)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary transition"
                >
                  {item.label === "الرئيسية" && <Home className="h-3.5 w-3.5 opacity-60" />}
                  {item.label === "حسابي" && <User className="h-3.5 w-3.5 opacity-60" />}
                  {item.label}
                </a>
              );
            }
            return (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => openMenu(item.label)}
                onMouseLeave={scheduleClose}
              >
                <button
                  onClick={() => setActiveMega(isActive ? null : item.label)}
                  aria-expanded={isActive}
                  aria-haspopup="true"
                  className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-foreground/80 hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {item.label}
                  <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition ${isActive ? "rotate-180" : ""}`} />
                </button>

                {isActive && (
                  <div
                    className="absolute right-1/2 translate-x-1/2 top-full z-50 pt-3"
                    style={{ pointerEvents: "auto" }}
                  >
                    {/* Invisible hover bridge covers the gap between button and panel */}
                    <div aria-hidden className="absolute inset-x-0 -top-1 h-4" />
                    <div
                      role="menu"
                      className="w-[min(90vw,880px)] rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <div className="mb-4 flex items-center justify-between px-2">
                        <div>
                          <div className="text-xs font-medium text-slate-500">ASH HOLDING</div>
                          <div className="text-base font-bold text-slate-900">{item.label}</div>
                        </div>
                        <div className="h-px flex-1 mx-4 bg-gradient-to-l from-transparent via-slate-200 to-transparent" />
                        <a
                          href="#contact"
                          onClick={() => setActiveMega(null)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0"
                        >
                          اطلب استشارة ←
                        </a>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {item.items.map((m) => (
                          <a
                            key={m.title}
                            href={m.href}
                            onClick={() => setActiveMega(null)}
                            className="group flex items-start gap-3 rounded-2xl p-3 hover:bg-slate-50 transition"
                          >
                            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONE[m.tone]} transition group-hover:scale-105`}>
                              <m.icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                                {m.title}
                              </div>
                              <div className="text-[11px] leading-relaxed text-slate-500 mt-0.5">
                                {m.desc}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden md:inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition"
          >
            <LogIn className="h-4 w-4" />
            دخول العملاء
          </Link>
          <button
            className="lg:hidden grid h-10 w-10 place-items-center rounded-xl border border-border bg-card"
            onClick={() => setOpen(!open)}
            aria-label="menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-[85vh]" : "max-h-0"}`}>
        <div className="glass border-t border-border/60 px-4 pb-6 pt-2 max-h-[85vh] overflow-y-auto">
          {NAV.map((item, i) => (
            <div key={item.label} className="border-b border-border/40 last:border-0">
              {item.items ? (
                <>
                  <button
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                    className="flex w-full items-center justify-between py-3 text-sm font-semibold"
                  >
                    {item.label}
                    <ChevronDown className={`h-4 w-4 transition ${openIdx === i ? "rotate-180" : ""}`} />
                  </button>
                  {openIdx === i && (
                    <div className="pb-3 space-y-1">
                      {item.items.map((m) => (
                        <a
                          key={m.title}
                          href={m.href}
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-secondary"
                        >
                          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE[m.tone]}`}>
                            <m.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold">{m.title}</div>
                            <div className="text-[11px] text-muted-foreground">{m.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <a href={item.href} onClick={() => setOpen(false)} className="block py-3 text-sm font-semibold">
                  {item.label}
                </a>
              )}
            </div>
          ))}
          <a href="#portal" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            <LogIn className="h-4 w-4" /> دخول العملاء
          </a>
        </div>
      </div>
    </header>
  );
}
