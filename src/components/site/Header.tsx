import { useEffect, useState } from "react";
import { Menu, X, ChevronDown, LogIn } from "lucide-react";

type MenuItem = { label: string; href?: string; children?: { label: string; href: string }[] };

const NAV: MenuItem[] = [
  { label: "الرئيسية", href: "#home" },
  {
    label: "الشركة",
    children: [
      { label: "من نحن", href: "#about" },
      { label: "رؤيتنا", href: "#vision" },
      { label: "فريق العمل", href: "#team" },
      { label: "الأسئلة الشائعة", href: "#faq" },
    ],
  },
  {
    label: "الخدمات",
    children: [
      { label: "تطوير المواقع", href: "#services" },
      { label: "تطوير تطبيقات الجوال", href: "#services" },
      { label: "الأنظمة ولوحات التحكم", href: "#services" },
      { label: "الذكاء الاصطناعي والأتمتة", href: "#services" },
      { label: "التصميم والهوية", href: "#services" },
      { label: "التسويق الرقمي", href: "#services" },
      { label: "الاستضافة والسيرفرات", href: "#hosting" },
      { label: "خدمات الطلاب", href: "#services" },
    ],
  },
  {
    label: "المنتجات",
    children: [
      { label: "ASH Client OS", href: "#products" },
      { label: "ASH Web AI", href: "#products" },
      { label: "ASH Stream", href: "#products" },
      { label: "ASH Stores", href: "#products" },
      { label: "Numaxio", href: "#products" },
      { label: "DigiMart", href: "#products" },
      { label: "Student OS", href: "#products" },
    ],
  },
  {
    label: "الاستضافة والسيرفرات",
    children: [
      { label: "استضافة مشتركة", href: "#hosting" },
      { label: "VPS", href: "#hosting" },
      { label: "سيرفرات مخصصة", href: "#hosting" },
      { label: "إدارة السيرفرات", href: "#hosting" },
      { label: "البريد و SMTP", href: "#hosting" },
    ],
  },
  {
    label: "التسويق الرقمي",
    children: [
      { label: "SEO", href: "#marketing" },
      { label: "الإعلانات", href: "#marketing" },
      { label: "إدارة الحملات", href: "#marketing" },
      { label: "الهوية والمحتوى", href: "#marketing" },
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
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand shadow-glow">
            <span className="text-sm font-bold text-primary-foreground">A</span>
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-sm font-bold tracking-tight">ASH HOLDING</div>
            <div className="text-[10px] text-muted-foreground">شركة علي صالح الشهري القابضة</div>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item, i) => (
            <div key={item.label} className="relative group">
              <button
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary transition"
                onClick={() => item.children ? setOpenIdx(openIdx === i ? null : i) : null}
              >
                {item.label}
                {item.children && <ChevronDown className="h-3.5 w-3.5 opacity-60 transition group-hover:rotate-180" />}
              </button>
              {item.children && (
                <div className="absolute right-0 top-full mt-2 w-60 opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 transition-all">
                  <div className="glass rounded-2xl p-2 shadow-soft border border-border/60">
                    {item.children.map((c) => (
                      <a key={c.label} href={c.href} className="block rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-secondary hover:text-foreground transition">
                        {c.label}
                      </a>
                    ))}
                  </div>
                </div>
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
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-[80vh]" : "max-h-0"}`}>
        <div className="glass border-t border-border/60 px-4 pb-6 pt-2 max-h-[80vh] overflow-y-auto">
          {NAV.map((item, i) => (
            <div key={item.label} className="border-b border-border/40 last:border-0">
              {item.children ? (
                <>
                  <button
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                    className="flex w-full items-center justify-between py-3 text-sm font-semibold"
                  >
                    {item.label}
                    <ChevronDown className={`h-4 w-4 transition ${openIdx === i ? "rotate-180" : ""}`} />
                  </button>
                  {openIdx === i && (
                    <div className="pb-2 pr-3">
                      {item.children.map((c) => (
                        <a key={c.label} href={c.href} onClick={() => setOpen(false)} className="block py-1.5 text-sm text-muted-foreground hover:text-foreground">
                          {c.label}
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
