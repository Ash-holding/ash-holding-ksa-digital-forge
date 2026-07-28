import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Send, Calendar, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, apiError } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client/support/$id")({
  component: ClientTicketDetail,
});

function ClientTicketDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["client-ticket", id],
    queryFn: async () => (await api.get(`/support/tickets/${id}`)).data.ticket,
    refetchInterval: 5000, refetchOnWindowFocus: true,
  });
  const t = q.data;
  const [msg, setMsg] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [t?.messages?.length]);

  const send = useMutation({
    mutationFn: () => api.post(`/support/tickets/${id}/messages`, { message: msg }),
    onSuccess: () => { setMsg(""); qc.invalidateQueries({ queryKey: ["client-ticket", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <DetailShell
      backTo="/client/support"
      icon={LifeBuoy}
      loading={q.isLoading}
      title={t ? <span className="font-mono" dir="ltr">{t.ticketNumber}</span> : "—"}
      subtitle={t?.subject}
      status={t && <StatusBadge value={t.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
    >
      {q.isLoading || !t ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <DetailSection title="المحادثة" icon={Sparkles} className="flex flex-col min-h-[70vh]">
            <div className="flex-1 overflow-y-auto space-y-3 -mx-2 px-2 max-h-[60vh]">
              <AnimatePresence initial={false}>
                {(t.messages ?? []).map((m: any) => {
                  const staff = m.sender?.role && m.sender.role !== "CLIENT";
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex", staff ? "justify-start" : "justify-end")}
                    >
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                        staff
                          ? "bg-muted text-foreground"
                          : "bg-gradient-to-br from-electric to-purple-500 text-white",
                      )}>
                        <div className="whitespace-pre-wrap">{m.message}</div>
                        <div className={cn("mt-1 text-[10px] opacity-70", !staff && "text-white/80")}>
                          {m.sender?.name} · {formatDate(m.createdAt)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={endRef} />
              {(!t.messages || t.messages.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-10">لا رسائل بعد</p>
              )}
            </div>

            {t.status !== "CLOSED" && (
              <div className="mt-3 border-t border-border pt-3 flex gap-2">
                <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="اكتب رسالتك…" className="flex-1" />
                <Button size="icon" className="h-auto" onClick={() => msg.trim() && send.mutate()} disabled={!msg.trim() || send.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </DetailSection>

          <div className="space-y-4">
            <DetailSection title="تفاصيل التذكرة" icon={Calendar}>
              <KV k="الحالة" v={<StatusBadge value={t.status} />} />
              <KV k="الأولوية" v={t.priority} />
              <KV k="أُنشئت" v={formatDate(t.createdAt)} />
              <KV k="آخر تحديث" v={formatDate(t.updatedAt)} />
              <KV k="الوصف" v={<span className="text-xs whitespace-pre-wrap">{t.description || "—"}</span>} />
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
