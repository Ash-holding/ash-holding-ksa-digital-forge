import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderKanban, Boxes, FileText, ScrollText,
  LifeBuoy, CreditCard, Files, User, Bell, Menu, X, LogOut, Wallet, Megaphone,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ITEMS = [
  { to: "/client", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { to: "/client/projects", label: "المشاريع", icon: FolderKanban },
  { to: "/client/services", label: "الخدمات", icon: Boxes },
  { to: "/client/invoices", label: "الفواتير", icon: FileText },
  { to: "/client/wallet", label: "المحفظة الرقمية", icon: Wallet },
  { to: "/client/financing", label: "تمويل الخدمات", icon: Wallet },
  { to: "/client/contracts", label: "العقود", icon: ScrollText },
  { to: "/affiliate", label: "الإحالات", icon: Megaphone },
  { to: "/client/support", label: "الدعم", icon: LifeBuoy },
  { to: "/client/payments", label: "المدفوعات", icon: CreditCard },
  { to: "/client/files", label: "الملفات", icon: Files },
  { to: "/client/notifications", label: "الإشعارات", icon: Bell },
  { to: "/client/profile", label: "الملف الشخصي", icon: User },
] as const;

// Mobile bottom nav: pick 5 most important
const BOTTOM = [
  { to: "/client", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { to: "/client/projects", label: "المشاريع", icon: FolderKanban },
  { to: "/client/invoices", label: "فواتير", icon: FileText },
  { to: "/client/support", label: "الدعم", icon: LifeBuoy },
  { to: "/client/profile", label: "حسابي", icon: User },
] as const;

export function ClientLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : (path === to || path.startsWith(to + "/"));

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 border-l border-border bg-card/50 flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand shadow-glow">
            <span className="text-sm font-bold text-primary-foreground">A</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">ASH HOLDING</div>
            <div className="text-[10px] text-muted-foreground">بوابة العميل</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {ITEMS.map((it) => {
            const active = isActive(it.to, "exact" in it && it.exact);
            return (
              <Link
                key={it.to} to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                  active ? "bg-electric/10 text-electric" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-72 bg-card border-l border-border lg:hidden flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                <div className="text-sm font-bold">حسابي</div>
                <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-border">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {ITEMS.map((it) => {
                  const active = isActive(it.to, "exact" in it && it.exact);
                  return (
                    <Link key={it.to} to={it.to} onClick={() => setOpen(false)}
                      className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        active ? "bg-electric/10 text-electric" : "text-muted-foreground hover:bg-muted/50")}
                    >
                      <it.icon className="h-4 w-4" />
                      {it.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border bg-background/70 backdrop-blur-md sticky top-0 z-30">
          <div className="h-full px-4 md:px-6 flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden grid h-9 w-9 place-items-center rounded-lg border border-border"
            ><Menu className="h-4 w-4" /></button>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">مرحباً</div>
              <div className="text-sm font-bold truncate">{user?.name}</div>
            </div>
            <Link to="/client/notifications" className="grid h-9 w-9 place-items-center rounded-lg border border-border">
              <Bell className="h-4 w-4" />
            </Link>
            <button
              onClick={async () => { await logout(); toast.success("تم تسجيل الخروج"); navigate({ to: "/login" }); }}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-rose-400 hover:bg-rose-500/10"
            ><LogOut className="h-4 w-4" /></button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden pb-20 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="grid grid-cols-5">
            {BOTTOM.map((it) => {
              const active = isActive(it.to, "exact" in it && it.exact);
              return (
                <Link key={it.to} to={it.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold",
                    active ? "text-electric" : "text-muted-foreground"
                  )}
                >
                  <it.icon className="h-5 w-5" />
                  {it.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
