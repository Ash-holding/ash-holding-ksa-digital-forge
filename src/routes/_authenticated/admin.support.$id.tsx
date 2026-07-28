import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { LifeBuoy, Send, User, Lock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, apiError } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/support/$id")({
  component: AdminSupportDetail,
});

function AdminSupportDetail() {
  const { id } = Route.useParams();
  const _nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => (await api.get(`/support/tickets/${id}`)).data.ticket,
    refetchInterval: 5000, refetchOnWindowFocus: true,
  });
  const t = q.data;
  const [msg, setMsg] = useState("");
  const [internal, setInternal] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [t?.messages?.length]);

  const patch = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.patch(`/support/tickets/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ticket", id] }); qc.invalidateQueries({ queryKey: ["tickets"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const send = useMutation({
    mutationFn: () => api.post(`/support/tickets/${id}/messages`, { message: msg, isInternal: internal }),
    onSuccess: () => { setMsg(""); qc.invalidateQueries({ queryKey: ["ticket", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <DetailShell
      backTo="/admin/support"
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Chat */}
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
                      className={cn("flex gap-2", staff ? "justify-end" : "justify-start")}
                    >
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                        m.isInternal
                          ? "bg-amber-500/10 border border-amber-500/30 text-amber-100"
                          : staff
                            ? "bg-gradient-to-br from-electric to-purple-500 text-white"
                            : "bg-muted text-foreground",
                      )}>
                        {m.isInternal && <div className="text-[10px] font-bold flex items-center gap-1 mb-1"><Lock className="h-3 w-3" /> ملاحظة داخلية</div>}
                        <div className="whitespace-pre-wrap">{m.message}</div>
                        <div className={cn("mt-1 text-[10px] opacity-70", staff && !m.isInternal ? "text-white/80" : "")}>
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

            <div className="mt-3 border-t border-border pt-3 space-y-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                <Lock className="h-3 w-3" /> ملاحظة داخلية (لا يراها العميل)
              </label>
              <div className="flex gap-2">
                <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="اكتب ردك…" className="flex-1" />
                <Button size="icon" className="h-auto" onClick={() => msg.trim() && send.mutate()} disabled={!msg.trim() || send.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DetailSection>

          {/* Sidebar */}
          <div className="space-y-4">
            <DetailSection title="العميل" icon={User}>
              <KV k="الاسم" v={t.client?.user?.name} />
              <KV k="البريد" v={t.client?.user?.email} mono dir="ltr" />
            </DetailSection>

            <DetailSection title="التحكم">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">الحالة</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["OPEN", "IN_PROGRESS", "WAITING", "CLOSED"].map((s) => (
                      <Button key={s} size="sm" variant={t.status === s ? "default" : "outline"} className="h-7 text-xs" onClick={() => patch.mutate({ status: s })}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">الأولوية</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["LOW", "NORMAL", "HIGH", "URGENT"].map((s) => (
                      <Button key={s} size="sm" variant={t.priority === s ? "default" : "outline"} className="h-7 text-xs" onClick={() => patch.mutate({ priority: s })}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <KV k="الوصف" v={<span className="text-xs whitespace-pre-wrap">{t.description || "—"}</span>} />
                <KV k="آخر تحديث" v={formatDate(t.updatedAt)} />
                <KV k="أُنشئت" v={formatDate(t.createdAt)} />
              </div>
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
