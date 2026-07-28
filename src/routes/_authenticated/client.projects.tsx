import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/client/projects")({
  component: ClientProjectsLayout,
});

function ClientProjectsLayout() {
  return <Outlet />;
}