import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getAccessToken } from "@/lib/api";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  // Token in storage means a login just occurred; treat as loading until user hydrates
  const hasToken = typeof window !== "undefined" && !!getAccessToken();
  const pending = loading || (hasToken && !user);

  useEffect(() => {
    if (!pending && !user) {
      navigate({ to: "/login", search: { redirect: window.location.pathname } });
    }
  }, [pending, user, navigate]);

  if (pending || !user) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-background">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-electric border-t-transparent animate-spin" />
          <div className="text-sm text-muted-foreground">جارٍ التحقق...</div>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
