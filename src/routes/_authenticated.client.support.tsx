import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Plus, Send, MessageSquare } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { FormSheet } from "@/components/dashboard/FormSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDate, fromNow } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/client/support")({
  component: ClientSupport,
});

function ClientSupport() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["client-tickets", page], queryFn: async () => (await api.get("/support/tickets", { params: { page } })).data });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/support/tickets", d),
    onSuccess: () => { toast.success("تم إنشاء التذكرة"); qc.invalidateQueries({ queryKey: ["client-tickets"] }); setOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<any>[] = [
    { key: "n", header: "رقم", render: (r) => <span dir="ltr" className="font-mono text-xs">{r.ticketNumber}</span> },
    { key: "subject", header: "الموضوع", render: (r) => <span className="font-semibold">{r.subject}</span> },
    { key: "priority", header: "الأولوية", render: (r) => <StatusBadge value={r.priority} /> },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "msg", header: "رسائل", render: (r) => <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{r._count?.messages ?? 0}</span>, hideOnMobile: true },
    { key: "updated", header: "التحديث", render: (r) => fromNow(r.updatedAt), hideOnMobile: true },
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-electric" /><h1 className="text-xl font-black">الدعم الفني</h1></div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />تذكرة جديدة</Button>
      </div>
      <DataTable columns={columns} rows={list.data?.rows} loading={list.isLoading}
        total={list.data?.total} page={page} pageSize={20} onPageChange={setPage}
        onRowClick={(r: any) => setSelectedId(r.id)}
        emptyTitle="لا توجد تذاكر بعد" emptyDescription="أنشئ تذكرة جديدة وسنعود لك سريعاً." />

      <FormSheet open={open} onOpenChange={setOpen} title="تذكرة جديدة" submitText="إرسال"
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          await create.mutateAsync(Object.fromEntries(fd.entries()));
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>الموضوع *</Label><Input name="subject" required /></div>
          <div className="space-y-1.5"><Label>الوصف</Label><Textarea name="description" rows={5} placeholder="اشرح مشكلتك بتفصيل..." /></div>
          <div className="space-y-1.5"><Label>الأولوية</Label>
            <select name="priority" defaultValue="NORMAL" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="LOW">منخفضة</option><option value="NORMAL">متوسطة</option><option value="HIGH">عالية</option><option value="URGENT">عاجلة</option>
            </select>
          </div>
        </div>
      </FormSheet>

      <ClientTicketDetail id={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}

function ClientTicketDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [msg, setMsg] = useState("");
  const t = useQuery({ queryKey: ["client-ticket", id], queryFn: async () => (await api.get(`/support/tickets/${id}`)).data, enabled: !!id });
  const send = useMutation({
    mutationFn: () => api.post(`/support/tickets/${id}/messages`, { message: msg }),
    onSuccess: () => { setMsg(""); qc.invalidateQueries({ queryKey: ["client-ticket", id] }); qc.invalidateQueries({ queryKey: ["client-tickets"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-5 border-b border-border">
          <SheetTitle className="truncate">{t.data?.ticket.subject || "..."}</SheetTitle>
          {t.data?.ticket && (
            <div className="flex flex-wrap gap-2 mt-2">
              <StatusBadge value={t.data.ticket.status} />
              <StatusBadge value={t.data.ticket.priority} />
            </div>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {t.data?.ticket?.description && <div className="rounded-2xl bg-muted/30 border border-border p-3 text-sm">{t.data.ticket.description}</div>}
          {t.data?.ticket?.messages?.map((m: any) => {
            const own = m.sender.id === user?.id;
            return (
              <div key={m.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", own ? "bg-electric text-primary-foreground" : "bg-muted")}>
                  <div className="text-[10px] opacity-70 mb-0.5">{m.sender.name} · {formatDate(m.createdAt, true)}</div>
                  <div className="whitespace-pre-wrap">{m.message}</div>
                </div>
              </div>
            );
          })}
        </div>
        {t.data?.ticket?.status !== "CLOSED" && (
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="اكتب ردّك..." />
              <Button onClick={() => msg.trim() && send.mutate()} disabled={!msg.trim() || send.isPending} className="gap-2 self-end"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
