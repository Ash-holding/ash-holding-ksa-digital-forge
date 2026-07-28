import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/client/financing")({
  component: FinancingLayout,
});

function FinancingLayout() {
  return <Outlet />;
}