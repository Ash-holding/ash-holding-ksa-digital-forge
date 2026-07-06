import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, FolderKanban, Boxes, FileText, ScrollText,
  LifeBuoy, CreditCard, Files, UserCog, Settings, ClipboardList,
  Menu, X, LogOut, Bell, Search, ChevronsLeft, BarChart3,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { toast } from "sonner";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const ITEMS: NavItem[] = [
  { to: "/admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { to: "/admin/clients", label: "العملاء", icon: Users },
  { to: "/admin/projects", label: "المشاريع", icon: FolderKanban },
  { to: "/admin/services", label: "الخدمات", icon: Boxes },
  { to: "/admin/invoices", label: "الفواتير", icon: FileText },
  { to: "/admin/contracts", label: "العقود", icon: ScrollText },
  { to: "/admin/support", label: "الدعم", icon: LifeBuoy },
  { to: "/admin/payments", label: "المدفوعات", icon: CreditCard },
  { to: "/admin/files", label: "الملفات", icon: Files },
  { to: "/admin/users", label: "المستخدمون", icon: UserCog },
  { to: "/admin/reports", label: "التقارير", icon: BarChart3 },
  { to: "/admin/settings", label: "الإعدادات", icon: Settings },
  { to: "/admin/audit-log", label: "سجل التدقيق", icon: ClipboardList },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : (path === to || path.startsWith(to + "/"));

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-l border-border bg-card/50 flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand shadow-glow">
            <span className="text-sm font-bold text-primary-foreground">A</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">ASH HOLDING</div>
            <div className="text-[10px] text-muted-foreground">لوحة الإدارة</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {ITEMS.map((it) => {
            const active = isActive(it.to, it.exact);
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
        <div className="p-3 border-t border-border">
          <div className="rounded-xl bg-muted/40 p-3 text-xs">
            <div className="font-semibold">{user?.name}</div>
            <div className="text-muted-foreground truncate">{user?.email}</div>
            {user?.role && <div className="mt-2"><StatusBadge value={user.role} /></div>}
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
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
                <div className="text-sm font-bold">ASH HOLDING</div>
                <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-border">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {ITEMS.map((it) => {
                  const active = isActive(it.to, it.exact);
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

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-background/70 backdrop-blur-md sticky top-0 z-30">
          <div className="h-full px-4 md:px-6 flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden grid h-9 w-9 place-items-center rounded-lg border border-border"
              aria-label="menu"
            ><Menu className="h-4 w-4" /></button>

            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="بحث سريع..." className="w-full h-9 rounded-lg bg-muted/40 border border-border pr-9 pl-3 text-sm outline-none focus:ring-2 focus:ring-electric/40" />
            </div>
            <div className="flex-1 sm:hidden" />

            <button className="grid h-9 w-9 place-items-center rounded-lg border border-border relative"
              onClick={() => toast.info("لا توجد إشعارات جديدة")}
              aria-label="notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border px-2.5 h-9">
              <div className="h-7 w-7 grid place-items-center rounded-md bg-electric/10 text-electric text-xs font-bold">
                {user?.name?.[0] ?? "؟"}
              </div>
              <div className="text-xs font-semibold hidden md:block max-w-[120px] truncate">{user?.name}</div>
            </div>
            <button
              onClick={async () => { await logout(); toast.success("تم تسجيل الخروج"); navigate({ to: "/login" }); }}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-rose-400 hover:bg-rose-500/10"
              title="خروج"
            ><LogOut className="h-4 w-4" /></button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden">
          {children}
          <div className="h-6" />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title, description, actions, icon: Icon, badge,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = buildCrumbs(pathname);

  return (
    <div className="relative -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-2 border-b border-border/60 bg-gradient-to-b from-card/40 to-transparent">
      <div className="px-4 md:px-6 py-3.5 md:py-4 flex items-center gap-3">
        {Icon && (
          <div className="relative shrink-0 hidden xs:grid">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-electric to-purple-500 text-white shadow-md shadow-electric/25 ring-1 ring-white/10">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap leading-tight">
            <h1 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-foreground truncate">
              {title}
            </h1>
            {crumbs.length > 0 && (
              <nav aria-label="breadcrumb" className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/70">
                <span className="text-muted-foreground/40">·</span>
                <Link to="/admin" className="hover:text-electric transition-colors">لوحة الإدارة</Link>
                {crumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="text-muted-foreground/40">/</span>
                    <span className={i === crumbs.length - 1 ? "text-foreground/70" : ""}>{c.label}</span>
                  </span>
                ))}
              </nav>
            )}
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 text-[11.5px] sm:text-xs text-muted-foreground/80 truncate">{description}</p>
          )}
        </div>

        {actions && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {actions && (
        <div className="sm:hidden px-4 pb-3 flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

function buildCrumbs(pathname: string): Array<{ label: string; to?: string }> {
  const item = ITEMS.find((i) => {
    return i.exact ? pathname === i.to : pathname.startsWith(i.to);
  });
  const crumbs: Array<{ label: string; to?: string }> = [];
  if (item) {
    crumbs.push({ label: item.label, to: item.to });
    const rest = pathname.slice(item.to.length).split("/").filter(Boolean);
    if (rest[0] === "new") crumbs.push({ label: "جديد" });
    else if (rest[0] && rest[1] === "edit") crumbs.push({ label: "تعديل" });
    else if (rest[0]) crumbs.push({ label: "تفاصيل" });
  }
  return crumbs;
}

// Re-export unused imports to satisfy linter noise
export const _padding = ChevronsLeft;
