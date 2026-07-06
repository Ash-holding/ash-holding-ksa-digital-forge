import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { ClientLayout } from "@/components/dashboard/ClientLayout";
import { isStaff } from "@/lib/rbac";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/client")({
  component: ClientGate,
});

function ClientGate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Staff should not access client area — send them to admin dashboard.
    if (user && isStaff(user.role)) navigate({ to: "/admin", replace: true });
  }, [user, navigate]);

  if (!user) return null;
  if (user.role !== "CLIENT") {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center p-8 bg-background">
        <div className="max-w-md text-center space-y-4 rounded-2xl border border-border/60 bg-card/40 p-8 backdrop-blur">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 grid place-items-center">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-bold">هذه المنطقة مخصّصة للعملاء</h2>
          <p className="text-sm text-muted-foreground">جارٍ تحويلك إلى لوحة الإدارة...</p>
        </div>
      </div>
    );
  }
  return (
    <ClientLayout>
      <Outlet />
    </ClientLayout>
  );
}
