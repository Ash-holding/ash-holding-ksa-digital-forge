import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { SkeletonRows, EmptyState } from "@/components/dashboard/EmptyState";
import { fromNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/client/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get("/notifications")).data });
  const readAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); toast.success("تم تمييز الكل كمقروء"); },
  });
  const readOne = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-electric" /><h1 className="text-xl font-black">الإشعارات</h1>{data?.unread ? <span className="ml-1 text-xs bg-electric/10 text-electric px-2 py-0.5 rounded-full">{data.unread}</span> : null}</div>
        {data?.unread ? (
          <Button variant="ghost" size="sm" onClick={() => readAll.mutate()} className="gap-1 text-xs"><CheckCheck className="h-3.5 w-3.5" />الكل كمقروء</Button>
        ) : null}
      </div>
      {isLoading ? <SkeletonRows rows={6} /> : !data?.rows?.length ? (
        <EmptyState icon={Bell} title="لا توجد إشعارات" />
      ) : (
        <div className="space-y-2">
          {data.rows.map((n: any) => (
            <button key={n.id} onClick={() => !n.isRead && readOne.mutate(n.id)}
              className={cn(
                "w-full text-right rounded-2xl border p-4 transition",
                n.isRead ? "border-border bg-card" : "border-electric/30 bg-electric/5 hover:bg-electric/10",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{n.title}</div>
                  {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
                </div>
                <div className="text-[11px] text-muted-foreground shrink-0">{fromNow(n.createdAt)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
