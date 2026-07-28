import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { fromNow } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/affiliate/notifications")({
  component: NotificationsPage,
});

type Notif = { id: string; title: string; body?: string | null; link?: string | null; category: string; isRead: boolean; createdAt: string };

function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-notifications"],
    queryFn: async () => (await api.get("/affiliate/notifications")).data as { items: Notif[] },
    refetchInterval: 15000,
  });

  const readAll = useMutation({
    mutationFn: async () => (await api.post("/affiliate/notifications/read-all")).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliate-notifications"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          <p className="text-sm text-muted-foreground">آخر التحديثات على حسابك.</p>
        </div>
        <button onClick={() => readAll.mutate()}
          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold flex items-center gap-1">
          <CheckCheck className="h-3 w-3" /> قراءة الكل
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="font-semibold">لا توجد إشعارات</div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((n) => (
            <div key={n.id} className={`rounded-xl border border-border p-4 ${n.isRead ? "bg-card/20" : "bg-amber-500/5 border-amber-500/20"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground mt-1">{n.body}</div>}
                </div>
                <div className="text-[10px] text-muted-foreground whitespace-nowrap">{fromNow(n.createdAt)}</div>
              </div>
              {n.link && (
                <a href={n.link} className="text-xs text-amber-500 mt-2 inline-block">عرض التفاصيل ←</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
