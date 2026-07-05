import { motion } from "framer-motion";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  gradient,
  description,
  visual,
}: {
  eyebrow: string;
  title: ReactNode;
  gradient?: string;
  description: string;
  visual?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-24">
      {/* animated ambient */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-electric/15 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="absolute top-20 -left-40 h-[500px] w-[500px] rounded-full bg-purple-accent/10 blur-3xl"
        />
        {/* animated grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        {/* breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground"
        >
          <Link to="/" className="hover:text-electric transition">الرئيسية</Link>
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{eyebrow}</span>
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs font-medium mb-5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-electric animate-pulse" />
              {eyebrow}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
            >
              {title}
              {gradient && (
                <>
                  {" "}
                  <span className="gradient-text">{gradient}</span>
                </>
              )}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl"
            >
              {description}
            </motion.p>
          </div>

          {visual && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              {visual}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
