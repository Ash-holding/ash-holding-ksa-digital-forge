import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ProjectDetailView } from "@/components/projects/ProjectDetailView";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/projects/$id")({
  component: AdminProjectDetail,
});

function AdminProjectDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-1.5">
        <Link to="/admin/projects"><ArrowRight className="h-4 w-4" /> عودة للمشاريع</Link>
      </Button>
      <ProjectDetailView projectId={id} isAdmin={true} />
    </div>
  );
}
