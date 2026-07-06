import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { ClientLayout } from "@/components/dashboard/ClientLayout";

export const Route = createFileRoute("/_authenticated/client")({
  component: ClientGate,
});

function ClientGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user && user.role !== "CLIENT") navigate({ to: "/admin", replace: true });
  }, [user, navigate]);
  if (!user || user.role !== "CLIENT") return null;
  return <ClientLayout><Outlet /></ClientLayout>;
}
