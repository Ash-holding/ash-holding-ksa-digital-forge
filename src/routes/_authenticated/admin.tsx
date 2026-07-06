import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AdminLayout } from "@/components/dashboard/AdminLayout";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});

function AdminGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user && user.role === "CLIENT") navigate({ to: "/client", replace: true });
  }, [user, navigate]);
  if (!user || user.role === "CLIENT") return null;
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
