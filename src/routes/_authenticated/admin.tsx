import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AdminLayout } from "@/components/dashboard/AdminLayout";
import { allowedForAdminPath, isStaff } from "@/lib/rbac";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});

function AdminGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (user && user.role === "CLIENT") navigate({ to: "/client", replace: true });
  }, [user, navigate]);

  if (!user) return null;
  if (!isStaff(user.role)) return null;

  const authorized = allowedForAdminPath(user.role, pathname);

  return (
    <AdminLayout>
      {authorized ? <Outlet /> : <Forbidden role={user.role} />}
    </AdminLayout>
  );
}

function Forbidden({ role }: { role: string }) {
  return (
    <div dir="rtl" className="min-h-[60vh] grid place-items-center p-8">
      <div className="max-w-md text-center space-y-4 rounded-2xl border border-border/60 bg-card/40 p-8 backdrop-blur">
        <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 grid place-items-center">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">لا تملك صلاحية الوصول</h2>
        <p className="text-sm text-muted-foreground">
          هذه الصفحة مخصّصة لأدوار محددة. دورك الحالي: <span className="font-semibold">{role}</span>.
        </p>
        <p className="text-xs text-muted-foreground">تواصل مع مدير النظام لطلب الصلاحية المناسبة.</p>
      </div>
    </div>
  );
}
