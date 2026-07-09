import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft, Printer, Download, Calendar, FileCheck2, Scale,
  ShieldCheck, Copy, Check, List, ArrowUp,
} from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export type LegalSection = {
  id: string;
  title: string;
  /** Rendered inside a prose block. Use standard tags (p, ul, li, strong, table). */
  body: ReactNode;
};

export type LegalDocumentProps = {
  /** Small tag above title, e.g. "وثيقة قانونية" */
  eyebrow: string;
  /** Page title, e.g. "الشروط والأحكام" */
  title: string;
  /** Short one-line description */
  description: string;
  /** ISO date string of last update */
  updatedAt: string;
  /** Document version, e.g. "1.2" */
  version: string;
  /** Reference/document number, e.g. "ASH-LEG-TC-2026-01" */
  reference: string;
  /** Big icon shown in hero */
  icon: React.ComponentType<{ className?: string }>;
  /** Ordered legal sections rendered as numbered clauses */
  sections: LegalSection[];
  /** Optional preamble paragraphs shown before the first section */
  preamble?: ReactNode;
};

export function LegalDocument(props: LegalDocumentProps) {
  const {
    eyebrow, title, description, updatedAt, version, reference,
    icon: Icon, sections, preamble,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 20, mass: 0.2 });

  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  const [showTop, setShowTop] = useState(false);

  // Scroll-spy for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
        if (visible[0]) setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
        year: "numeric", month: "long", day: "numeric",
      }).format(new Date(updatedAt));
    } catch { return updatedAt; }
  }, [updatedAt]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Header />

      {/* Reading progress bar */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed top-0 inset-x-0 z-50 h-[3px] origin-right bg-gradient-to-l from-electric via-purple-accent to-electric print:hidden"
      />

      <main ref={containerRef}>
        {/* ============= HERO ============= */}
        <section className="relative overflow-hidden pt-28 pb-14 md:pt-36 md:pb-20 print:hidden">
          {/* Ambient orbs */}
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2 }}
              className="absolute -top-40 right-1/4 h-[520px] w-[520px] rounded-full bg-electric/15 blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="absolute top-20 -left-40 h-[520px] w-[520px] rounded-full bg-purple-accent/10 blur-3xl"
            />
            {/* Grid */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "56px 56px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            {/* Breadcrumb */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground"
            >
              <Link to="/" className="hover:text-electric transition">الرئيسية</Link>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="text-muted-foreground/70">قانوني</span>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{title}</span>
            </motion.div>

            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:gap-16 items-end">
              <div className="min-w-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs font-medium mb-5"
                >
                  <Scale className="h-3.5 w-3.5 text-electric" />
                  {eyebrow}
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
                >
                  {title}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl"
                >
                  {description}
                </motion.p>

                {/* Metadata pills */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="mt-7 flex flex-wrap items-center gap-2.5"
                >
                  <MetaPill icon={Calendar} label="آخر تحديث" value={formattedDate} />
                  <MetaPill icon={FileCheck2} label="الإصدار" value={`v${version}`} />
                  <MetaPill icon={ShieldCheck} label="المرجع" value={reference} mono />
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="mt-6 flex flex-wrap gap-2.5"
                >
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition"
                  >
                    <Printer className="h-4 w-4" />
                    طباعة الوثيقة
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted/50 transition"
                  >
                    <Download className="h-4 w-4" />
                    حفظ PDF
                  </button>
                  <button
                    onClick={copyLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted/50 transition"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "تم النسخ" : "نسخ الرابط"}
                  </button>
                </motion.div>
              </div>

              {/* Hero visual — animated seal/stamp */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                className="hidden lg:block relative h-56 w-56"
              >
                {/* Rotating outer ring */}
                <motion.svg
                  viewBox="0 0 200 200"
                  className="absolute inset-0 h-full w-full text-electric/60"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                >
                  <defs>
                    <path
                      id="circlePath"
                      d="M 100, 100 m -85, 0 a 85,85 0 1,1 170,0 a 85,85 0 1,1 -170,0"
                    />
                  </defs>
                  <text fill="currentColor" fontSize="11" fontWeight="700" letterSpacing="3">
                    <textPath href="#circlePath">
                      ASH HOLDING · وثيقة قانونية رسمية · ASH HOLDING · وثيقة قانونية رسمية ·
                    </textPath>
                  </text>
                </motion.svg>

                {/* Inner rings */}
                <div className="absolute inset-6 rounded-full border-2 border-electric/30" />
                <div className="absolute inset-10 rounded-full border border-purple-accent/30" />

                {/* Center */}
                <div className="absolute inset-0 grid place-items-center">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow"
                  >
                    <Icon className="h-12 w-12" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============= CONTENT + TOC ============= */}
        <section className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8 pb-24">
          <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-12">
            {/* Sticky TOC */}
            <aside className="lg:sticky lg:top-24 lg:self-start print:hidden">
              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">
                  <List className="h-3.5 w-3.5" />
                  فهرس الوثيقة
                </div>
                <nav className="space-y-1 max-h-[60vh] overflow-y-auto -mx-2 px-2">
                  {sections.map((s, i) => {
                    const active = activeId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => scrollToSection(s.id)}
                        className={`group w-full text-right flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? "bg-electric/10 text-electric"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span
                          className={`shrink-0 mt-0.5 grid h-5 w-5 place-items-center rounded-md text-[10px] font-bold tabular-nums ${
                            active
                              ? "bg-electric text-white"
                              : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 text-right leading-snug">{s.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Footer notice */}
              <div className="mt-4 rounded-2xl border border-border bg-gradient-to-br from-electric/5 to-purple-accent/5 p-5 text-xs text-muted-foreground leading-relaxed">
                هذه الوثيقة مُلزِمة قانونياً وتُشكّل جزءاً لا يتجزأ من العلاقة التعاقدية بين
                <span className="font-bold text-foreground"> ASH HOLDING </span>
                والمستخدم أو العميل.
              </div>
            </aside>

            {/* Body */}
            <article className="min-w-0">
              {/* Print header (only visible on print) */}
              <div className="hidden print:block mb-8 pb-4 border-b">
                <div className="text-xl font-bold">ASH HOLDING — {title}</div>
                <div className="text-xs mt-1">
                  المرجع: {reference} · الإصدار: v{version} · آخر تحديث: {formattedDate}
                </div>
              </div>

              {preamble && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5 }}
                  className="mb-10 rounded-2xl border border-border bg-card/50 p-6 md:p-8 leading-loose text-[15px] text-muted-foreground legal-prose"
                >
                  {preamble}
                </motion.div>
              )}

              <div className="space-y-10">
                {sections.map((s, i) => (
                  <motion.section
                    key={s.id}
                    id={s.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    className="scroll-mt-28"
                  >
                    <header className="flex items-start gap-4 mb-5">
                      <div className="shrink-0 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-electric to-purple-accent text-white font-black tabular-nums shadow-glow">
                        {i + 1}
                      </div>
                      <div className="min-w-0 pt-1">
                        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight">
                          {s.title}
                        </h2>
                        <div className="mt-1 h-[3px] w-16 rounded-full bg-gradient-to-l from-electric to-purple-accent" />
                      </div>
                    </header>

                    <div className="legal-prose pr-0 lg:pr-15 text-[15px] leading-loose text-foreground/85">
                      {s.body}
                    </div>
                  </motion.section>
                ))}
              </div>

              {/* Sign-off */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mt-14 rounded-3xl border border-border bg-gradient-to-br from-card via-card to-electric/5 p-6 md:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">صادرة عن</div>
                    <div className="mt-1 text-lg font-extrabold">ASH HOLDING — شركة علي صالح الشهري القابضة</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      المملكة العربية السعودية · جميع الحقوق محفوظة © {new Date().getFullYear()}
                    </div>
                  </div>
                  <div className="text-left text-xs text-muted-foreground">
                    <div>المرجع: <span className="font-mono text-foreground/80">{reference}</span></div>
                    <div className="mt-1">الإصدار: <span className="font-bold text-foreground/80">v{version}</span></div>
                    <div className="mt-1">التاريخ: <span className="text-foreground/80">{formattedDate}</span></div>
                  </div>
                </div>
              </motion.div>

              {/* Cross-links */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
                {LEGAL_INDEX.filter((l) => l.to !== window.location.pathname).map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="group rounded-2xl border border-border bg-card/50 p-4 hover:border-electric/50 hover:bg-card transition"
                  >
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">وثيقة</div>
                    <div className="mt-1 font-bold text-sm group-hover:text-electric transition flex items-center gap-1.5">
                      {l.label}
                      <ChevronLeft className="h-3.5 w-3.5 opacity-0 -mr-1 group-hover:opacity-100 group-hover:-mr-0 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          </div>
        </section>

        {/* Back to top */}
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 left-6 z-40 grid h-11 w-11 place-items-center rounded-full bg-electric text-white shadow-glow hover:scale-110 transition print:hidden"
            aria-label="العودة للأعلى"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </main>

      <Footer />

      {/* Print & prose styles */}
      <style>{`
        .legal-prose p { margin-bottom: 0.9rem; }
        .legal-prose ul, .legal-prose ol { margin: 0.5rem 1.25rem 1rem; list-style: disc; padding-inline-start: 1rem; }
        .legal-prose ol { list-style: arabic-indic; }
        .legal-prose li { margin-bottom: 0.4rem; }
        .legal-prose li::marker { color: hsl(var(--electric, 210 100% 50%)); font-weight: 700; }
        .legal-prose strong { color: hsl(var(--foreground)); font-weight: 700; }
        .legal-prose h3 {
          font-size: 1rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }
        .legal-prose table {
          width: 100%; border-collapse: collapse; margin: 1rem 0;
          font-size: 0.875rem;
        }
        .legal-prose th, .legal-prose td {
          border: 1px solid hsl(var(--border));
          padding: 0.6rem 0.8rem; text-align: right;
        }
        .legal-prose th { background: hsl(var(--muted) / 0.5); font-weight: 700; }
        .legal-prose .def {
          display: inline-block; background: hsl(var(--muted) / 0.6);
          padding: 0.05rem 0.5rem; border-radius: 6px; font-weight: 700;
          color: hsl(var(--foreground));
        }
        @media print {
          body { background: white !important; color: black !important; }
          .legal-prose { color: black !important; }
        }
      `}</style>
    </div>
  );
}

function MetaPill({
  icon: Icon, label, value, mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-electric" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-bold text-foreground ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

const LEGAL_INDEX = [
  { to: "/terms", label: "الشروط والأحكام" },
  { to: "/privacy", label: "سياسة الخصوصية" },
  { to: "/acceptable-use", label: "اتفاقية الاستخدام" },
  { to: "/sla", label: "اتفاقية مستوى الخدمة" },
] as const;
