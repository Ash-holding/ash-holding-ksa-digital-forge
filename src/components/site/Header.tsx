import { useEffect, useState } from "react";
import {
  Menu, X, ChevronDown, LogIn, Home, Info, Sparkles, Workflow, HelpCircle, Phone,
  Code2, Smartphone, LayoutDashboard, Brain, Palette, GraduationCap, Wrench, Plug,
  Server, Cpu, Database, Settings2, Mail, ShieldCheck,
  Search, Target, FileText, Image as ImageIcon, Share2, BarChart3, User,
} from "lucide-react";

type MegaItem = { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; href: string };
type NavItem = { label: string; href?: string; items?: MegaItem[] };

const NAV: NavItem[] = [
  { label: "الرئيسية", href: "#home" },
  {
    label: "الشركة",
    items: [
      { icon: Info, title: "من نحن", desc: "قصة ASH HOLDING ورسالتنا الرقمية.", href: "#about" },
      { icon: Sparkles, title: "لماذا ASH", desc: "ما الذي يميزنا كشريك تقني.", href: "#why" },
      { icon: Workflow, title: "آلية العمل", desc: "منهجية واضحة من الفكرة للإطلاق.", href: "#process" },
      { icon: HelpCircle, title: "الأسئلة الشائعة", desc: "إجابات لأكثر الاستفسارات تكراراً.", href: "#faq" },
      { icon: Phone, title: "تواصل معنا", desc: "تحدث مع فريقنا مباشرة.", href: "#contact" },
    ],
  },
  {
    label: "الخدمات",
    items: [
      { icon: Code2, title: "تطوير المواقع والمنصات", desc: "مواقع ومنصات ويب مؤسسية عالية الأداء.", href: "#services" },
      { icon: Smartphone, title: "تطبيقات الجوال", desc: "iOS و Android بتجربة استخدام مميزة.", href: "#services" },
      { icon: LayoutDashboard, title: "الأنظمة ولوحات التحكم", desc: "أنظمة إدارية مخصصة تربط عملياتك.", href: "#services" },
      { icon: Brain, title: "الذكاء الاصطناعي والأتمتة", desc: "حلول AI وأتمتة تسرّع أعمالك.", href: "#services" },
      { icon: Palette, title: "التصميم والهوية", desc: "هوية بصرية وتجربة استخدام متكاملة.", href: "#services" },
      { icon: GraduationCap, title: "خدمات الطلاب والأعمال", desc: "حلول متخصصة للطلاب ورواد الأعمال.", href: "#services" },
      { icon: Wrench, title: "الدعم الفني والتشغيل", desc: "دعم مستمر وتشغيل موثوق ما بعد الإطلاق.", href: "#services" },
      { icon: Plug, title: "التكاملات والربط البرمجي", desc: "ربط الأنظمة عبر APIs بأمان وكفاءة.", href: "#services" },
    ],
  },
  {
    label: "الاستضافة والسيرفرات",
    items: [
      { icon: Server, title: "الاستضافة المشتركة", desc: "بيئة سريعة وآمنة للمواقع والمنصات.", href: "#hosting" },
      { icon: Cpu, title: "VPS", desc: "خوادم افتراضية بأداء مخصص ومرن.", href: "#hosting" },
      { icon: Database, title: "السيرفرات المخصصة", desc: "بنية مؤسسية للتطبيقات الحساسة.", href: "#hosting" },
      { icon: Settings2, title: "إدارة السيرفرات", desc: "إدارة Nginx و Linux باحتراف.", href: "#hosting" },
      { icon: Mail, title: "البريد و SMTP", desc: "حلول بريد باحترافية وإيصال عالٍ.", href: "#hosting" },
      { icon: ShieldCheck, title: "حماية ومراقبة السيرفرات", desc: "مراقبة ٢٤/٧ وحماية متعددة الطبقات.", href: "#hosting" },
    ],
  },
  {
    label: "التسويق الرقمي",
    items: [
      { icon: Search, title: "تحسين محركات البحث SEO", desc: "ظهور مستدام في نتائج البحث.", href: "#marketing" },
      { icon: Target, title: "الحملات الإعلانية", desc: "حملات مدفوعة الأداء على أهم المنصات.", href: "#marketing" },
      { icon: FileText, title: "إدارة المحتوى", desc: "محتوى عربي احترافي متسق مع العلامة.", href: "#marketing" },
      { icon: ImageIcon, title: "الهوية البصرية", desc: "بناء هوية بصرية ثابتة ومميزة.", href: "#marketing" },
      { icon: Share2, title: "إدارة السوشيال ميديا", desc: "إدارة كاملة للحسابات الاجتماعية.", href: "#marketing" },
      { icon: BarChart3, title: "تقارير وتحليلات", desc: "قرارات مبنية على بيانات دقيقة.", href: "#marketing" },
    ],
  },
  { label: "حسابي", href: "#portal" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
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
          {NAV.map((item) => (
            <div key={item.label} className="relative group">
              {item.items ? (
                <>
                  <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary transition">
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60 transition group-hover:rotate-180" />
                  </button>
                  {/* Mega dropdown */}
                  <div className="absolute right-0 top-full pt-3 opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 transition-all">
                    <div className={`glass rounded-2xl p-3 shadow-soft border border-border/60 grid gap-1 ${item.items.length > 4 ? "w-[640px] grid-cols-2" : "w-[340px]"}`}>
                      {item.items.map((m) => (
                        <a key={m.title} href={m.href} className="group/item flex items-start gap-3 rounded-xl p-3 hover:bg-secondary transition">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-electric/10 text-electric group-hover/item:bg-brand group-hover/item:text-primary-foreground transition">
                            <m.icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold">{m.title}</div>
                            <div className="text-[11px] text-muted-foreground leading-relaxed">{m.desc}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <a href={item.href} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary transition">
                  {item.label === "الرئيسية" && <Home className="h-3.5 w-3.5 opacity-60" />}
                  {item.label === "حسابي" && <User className="h-3.5 w-3.5 opacity-60" />}
                  {item.label}
                </a>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#portal"
            className="hidden md:inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition"
          >
            <LogIn className="h-4 w-4" />
            دخول العملاء
          </a>
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
                        <a key={m.title} href={m.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-secondary">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-electric/10 text-electric">
                            <m.icon className="h-4.5 w-4.5" />
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
