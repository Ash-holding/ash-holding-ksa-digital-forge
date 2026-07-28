import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/project-requests")({
  component: () => <Outlet />,
});
