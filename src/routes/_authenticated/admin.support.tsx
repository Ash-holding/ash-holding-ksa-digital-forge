import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LifeBuoy, Plus, MessageSquare, Send, Lock, Inbox, Clock, CheckCircle2, Flame, Users } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { FormSheet } from "@/components/dashboard/FormSheet";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDate, fromNow } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: SupportPage,
});

type Row = { id: string; ticketNumber: string; subject: string; status: string; priority: string; updatedAt: string; client: { user: { name: string } }; agent?: { name: string } | null; _count: { messages: number } };
type Stats = { total: number; open: number; inProgress: number; waiting: number; closed: number; urgent: number };

function SupportPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const clients = useQuery({ queryKey: ["clients-lite"], queryFn: async () => (await api.get("/clients", { params: { pageSize: 100 } })).data });
  const list = useQuery({
    queryKey: ["tickets", page],
    queryFn: async () => (await api.get("/support/tickets", { params: { page } })).data,
    refetchInterval: 8000, refetchOnWindowFocus: true,
  });
  const stats = list.data?.stats as Stats | undefined;
  const rows = (list.data?.rows ?? []) as Row[];
  const filtered = useMemo(() => (status ? rows.filter((r) => r.status === status) : rows), [rows, status]);

  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/support/tickets", d),
    onSuccess: () => { toast.success("تم إنشاء التذكرة"); qc.invalidateQueries({ queryKey: ["tickets"] }); setOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<Row>[] = [
    { key: "n", header: "رقم", render: (r) => <span dir="ltr" className="font-mono text-xs">{r.ticketNumber}</span> },
    { key: "subject", header: "الموضوع", render: (r) => (
      <div className="min-w-0">
        <div className="font-semibold truncate">{r.subject}</div>
        <div className="text-[11px] text-muted-foreground truncate">{r.client.user.name}</div>
      </div>
    ) },
    { key: "priority", header: "الأولوية", render: (r) => <StatusBadge value={r.priority} /> },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "agent", header: "المسند إليه", render: (r) => r.agent?.name || <span className="text-xs text-muted-foreground">غير مسند</span>, hideOnMobile: true },
    { key: "msg", header: "رسائل", render: (r) => <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" />{r._count.messages}</span>, hideOnMobile: true },
    { key: "updated", header: "آخر تحديث", render: (r) => <span className="text-xs">{fromNow(r.updatedAt)}</span>, hideOnMobile: true },
  ];

  return (
    <>
      <PageHeader icon={LifeBuoy} title="الدعم الفني" description="تذاكر العملاء ومحادثات فورية — تُحدَّث كل 8 ثواني."
        actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />تذكرة جديدة</Button>} />

      <AdminStatsRow loading={list.isLoading} stats={[
        { icon: LifeBuoy, label: "إجمالي التذاكر", value: stats?.total ?? 0, accent: "electric" },
        { icon: Inbox, label: "مفتوحة", value: stats?.open ?? 0, accent: "cyan" },
        { icon: Users, label: "قيد المعالجة", value: stats?.inProgress ?? 0, accent: "purple" },
        { icon: Clock, label: "بانتظار العميل", value: stats?.waiting ?? 0, accent: "amber" },
        { icon: CheckCircle2, label: "مغلقة", value: stats?.closed ?? 0, accent: "emerald" },
        { icon: Flame, label: "أولوية عالية/عاجلة", value: stats?.urgent ?? 0, accent: "rose" },
      ]} />

      <FilterChips value={status} onChange={setStatus} chips={[
        { key: "", label: "الكل", count: stats?.total },
        { key: "OPEN", label: "مفتوحة", count: stats?.open },
        { key: "IN_PROGRESS", label: "قيد المعالجة", count: stats?.inProgress },
        { key: "WAITING_CLIENT", label: "بانتظار العميل", count: stats?.waiting },
        { key: "CLOSED", label: "مغلقة", count: stats?.closed },
      ]} />

      <DataTable<Row> columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        onRowClick={(r) => setSelectedId(r.id)}
        emptyTitle="لا توجد تذاكر" />

      <FormSheet open={open} onOpenChange={setOpen} title="تذكرة جديدة" submitText="إنشاء"
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          const raw = Object.fromEntries(fd.entries());
          await create.mutateAsync(raw);
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>العميل *</Label>
            <select name="clientId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">اختر</option>
              {(clients.data?.rows ?? []).map((c: { id: string; user: { name: string } }) => <option key={c.id} value={c.id}>{c.user.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>الموضوع *</Label><Input name="subject" required /></div>
          <div className="space-y-1.5"><Label>الوصف</Label><Textarea name="description" rows={4} /></div>
          <div className="space-y-1.5"><Label>الأولوية</Label>
            <select name="priority" defaultValue="NORMAL" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["LOW","NORMAL","HIGH","URGENT"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </FormSheet>

      <TicketDetail id={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}


function TicketDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  const t = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => (await api.get(`/support/tickets/${id}`)).data,
    enabled: !!id,
  });
  const send = useMutation({
    mutationFn: (msg: { message: string; isInternal?: boolean }) => api.post(`/support/tickets/${id}/messages`, msg),
    onSuccess: () => { setMessage(""); setInternal(false); qc.invalidateQueries({ queryKey: ["ticket", id] }); qc.invalidateQueries({ queryKey: ["tickets"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch(`/support/tickets/${id}`, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ticket", id] }); qc.invalidateQueries({ queryKey: ["tickets"] }); toast.success("تم التحديث"); },
  });

  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-5 border-b border-border">
          <SheetTitle className="truncate">{t.data?.ticket.subject || "..."}</SheetTitle>
          {t.data?.ticket && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge value={t.data.ticket.status} />
              <StatusBadge value={t.data.ticket.priority} />
              <span className="text-xs text-muted-foreground">{t.data.ticket.client.user.name}</span>
            </div>
          )}
          {t.data?.ticket && (
            <div className="flex gap-2 pt-2">
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={t.data.ticket.status}
                onChange={(e) => update.mutate({ status: e.target.value })}
              >
                {["OPEN","IN_PROGRESS","WAITING_CLIENT","CLOSED"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={t.data.ticket.priority}
                onChange={(e) => update.mutate({ priority: e.target.value })}
              >
                {["LOW","NORMAL","HIGH","URGENT"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {t.data?.ticket?.description && (
            <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">{t.data.ticket.description}</div>
          )}
          {t.data?.ticket?.messages?.map((m: any) => {
            const own = m.sender.id === user?.id;
            return (
              <div key={m.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  m.isInternal ? "bg-amber-500/10 border border-amber-500/30 text-amber-100" :
                    own ? "bg-electric text-primary-foreground" : "bg-muted"
                )}>
                  {m.isInternal && <div className="flex items-center gap-1 text-[10px] font-semibold mb-1"><Lock className="h-3 w-3" />ملاحظة داخلية</div>}
                  <div className="text-[10px] opacity-70 mb-0.5">{m.sender.name} · {formatDate(m.createdAt, true)}</div>
                  <div className="whitespace-pre-wrap">{m.message}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="اكتب ردّك..." />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              ملاحظة داخلية (لا يراها العميل)
            </label>
            <Button size="sm" onClick={() => message.trim() && send.mutate({ message, isInternal: internal })} disabled={!message.trim() || send.isPending} className="gap-2">
              <Send className="h-3.5 w-3.5" /> إرسال
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
