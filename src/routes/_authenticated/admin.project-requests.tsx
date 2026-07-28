import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Inbox, Clock, Sparkles, CheckCircle2, AlertTriangle, Zap, MessageSquare,
  Rocket, Wallet, Calendar, Phone, User as UserIcon, Trash2, ArrowRight, Eye,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { formatDate } from "@/lib/format";
import { LiveBadge } from "@/components/client/LiveBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/project-requests")({
  component: ProjectRequestsPage,
});

function ProjectRequestsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const list = useQuery({
    queryKey: ["project-requests", status],
    queryFn: async () => (await api.get("/projects/requests/list", { params: { status: status ?? undefined, pageSize: 100 } })).data,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    retry: 1,
  });


  const rows = (list.data?.rows ?? []) as any[];
  const stats = list.data?.stats ?? { total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0, urgent: 0, last24h: 0 };

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/requests/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["project-requests"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { PENDING: [], UNDER_REVIEW: [], APPROVED: [], CONVERTED: [], REJECTED: [] };
    rows.forEach((r) => { (g[r.status] ??= []).push(r); });
    return g;
  }, [rows]);

  return (
    <>
      <PageHeader
        icon={Inbox} title="طلبات المشاريع"
        description="طلبات جديدة من العملاء — راجع، اعتمد، وحوّلها لمشاريع فعلية بضغطة واحدة."
        actions={<LiveBadge interval={8} />}
      />

      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Inbox, label: "إجمالي الطلبات", value: stats.total, accent: "electric" },
          { icon: Clock, label: "قيد الانتظار", value: stats.pending, accent: "amber" },
          { icon: Sparkles, label: "قيد الدراسة", value: stats.underReview, accent: "cyan" },
          { icon: CheckCircle2, label: "مقبولة/محوّلة", value: stats.approved, accent: "emerald" },
          { icon: AlertTriangle, label: "مرفوضة", value: stats.rejected, accent: "rose" },
          { icon: Zap, label: "عاجلة", value: stats.urgent, accent: "purple", hint: `آخر 24س: ${stats.last24h}` },
        ]}
      />

      <FilterChips
        value={status} onChange={setStatus}
        chips={[
          { key: "", label: "الكل", count: stats.total },
          { key: "PENDING", label: "قيد الانتظار", count: stats.pending },
          { key: "UNDER_REVIEW", label: "قيد الدراسة", count: stats.underReview },
          { key: "APPROVED", label: "مقبولة" },
          { key: "CONVERTED", label: "محوّلة" },
          { key: "REJECTED", label: "مرفوضة", count: stats.rejected },
        ]}
      />

      {list.isError && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-[12px] text-rose-200">
          تعذّر تحميل طلبات المشاريع: {apiError(list.error)}
          <Button size="sm" variant="outline" className="ms-2 h-7" onClick={() => list.refetch()}>إعادة المحاولة</Button>
        </div>
      )}
      {!list.isLoading && !list.isError && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-[12px] text-muted-foreground">
          لا توجد طلبات مطابقة. إن كان العميل قد أرسل طلبًا للتو، اضغط تحديث.
          <Button size="sm" variant="outline" className="ms-2 h-7" onClick={() => list.refetch()}>تحديث الآن</Button>
        </div>
      )}


      {/* Kanban */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {(["PENDING", "UNDER_REVIEW", "APPROVED", "CONVERTED", "REJECTED"] as const).map((col) => (
          <div key={col} className="rounded-2xl border border-border bg-card/50 p-2.5 min-h-[200px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <StatusBadge value={col} />
              <span className="text-[10px] text-muted-foreground">{grouped[col]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(grouped[col] ?? []).map((r) => (
                <button key={r.id} onClick={() => setSelected(r)}
                  className="w-full text-right rounded-xl border border-border bg-background p-2.5 hover:border-electric/40 transition group">
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <div className="font-bold text-[12px] truncate flex-1 group-hover:text-electric">{r.title}</div>
                    <StatusBadge value={r.priority} />
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mb-1.5">
                    {r.client?.user?.name ?? "—"} · {r.category}
                  </div>
                  {(r.budgetMin || r.budgetMax) && (
                    <div className="text-[10px] font-bold">
                      {r.budgetMin ? Number(r.budgetMin).toLocaleString("ar-SA") : "—"} – {r.budgetMax ? Number(r.budgetMax).toLocaleString("ar-SA") : "—"} ر.س
                    </div>
                  )}
                  <div className="text-[9px] text-muted-foreground mt-1">{formatDate(r.createdAt)}</div>
                </button>
              ))}
              {(grouped[col] ?? []).length === 0 && (
                <div className="rounded-xl border border-dashed border-border py-6 text-center text-[10px] text-muted-foreground">لا يوجد</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <RequestSheet
        request={selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onDelete={async (id) => { await del.mutateAsync(id); setSelected(null); }}
      />
    </>
  );
}

function RequestSheet({
  request, onOpenChange, onDelete,
}: { request: any | null; onOpenChange: (v: boolean) => void; onDelete: (id: string) => Promise<void> }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [budget, setBudget] = useState("");

  const patch = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/projects/requests/${request!.id}`, data),
    onSuccess: () => {
      toast.success("تم التحديث");
      qc.invalidateQueries({ queryKey: ["project-requests"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!request) return null;

  return (
    <Sheet open={!!request} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full sm:max-w-xl overflow-y-auto bg-card">
        <SheetHeader className="text-right">
          <SheetTitle className="text-base">{request.title}</SheetTitle>
          <SheetDescription>
            من {request.client?.user?.name} · {formatDate(request.createdAt)}
          </SheetDescription>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <StatusBadge value={request.status} />
            <StatusBadge value={request.priority} />
            <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold">{request.category}</span>
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-4 text-sm">
          {request.description && (
            <div>
              <div className="text-[11px] font-bold text-muted-foreground mb-1">الوصف</div>
              <p className="rounded-xl bg-muted/30 p-3 text-[12px] whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <InfoRow icon={Wallet} label="ميزانية" value={
              (request.budgetMin || request.budgetMax)
                ? `${request.budgetMin ? Number(request.budgetMin).toLocaleString("ar-SA") : "—"} – ${request.budgetMax ? Number(request.budgetMax).toLocaleString("ar-SA") : "—"} ر.س`
                : "—"
            } />
            <InfoRow icon={Calendar} label="مستهدف" value={request.targetDate ? formatDate(request.targetDate) : "—"} />
            <InfoRow icon={UserIcon} label="تواصل" value={request.contactName ?? request.client?.user?.name ?? "—"} />
            <InfoRow icon={Phone} label="هاتف" value={request.contactPhone ?? "—"} />
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">رد الإدارة / ملاحظة</Label>
            <Textarea rows={3} defaultValue={request.adminNote ?? ""} onChange={(e) => setNote(e.target.value)}
              placeholder="اذكر تقديراً زمنياً/مالياً أو توضيحاً للعميل…" />
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">ميزانية المشروع عند التحويل (اختياري)</Label>
            <Input type="number" step="100" value={budget} onChange={(e) => setBudget(e.target.value)}
              placeholder={request.budgetMax ? String(request.budgetMax) : "المبلغ النهائي"} />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-wrap gap-2">
          <ConfirmDialog title="حذف الطلب" description="سيتم حذف الطلب نهائياً."
            onConfirm={async () => { await onDelete(request.id); }}
            trigger={<Button variant="ghost" className="text-rose-400 gap-1"><Trash2 className="h-3.5 w-3.5" />حذف</Button>}
          />
          <Button variant="outline" className="gap-1"
            onClick={() => patch.mutate({ status: "UNDER_REVIEW", adminNote: note || undefined })}>
            <Eye className="h-3.5 w-3.5" />قيد الدراسة
          </Button>
          <Button variant="outline" className="gap-1 text-rose-400 border-rose-400/40"
            onClick={() => patch.mutate({ status: "REJECTED", adminNote: note || undefined })}>
            رفض
          </Button>
          <Button className="gap-1.5 bg-gradient-to-r from-electric to-purple-accent"
            onClick={() => patch.mutate({
              status: "APPROVED",
              convertToProject: true,
              adminNote: note || undefined,
              projectBudget: budget ? Number(budget) : undefined,
            })}>
            <Rocket className="h-3.5 w-3.5" />قبول وتحويل لمشروع
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-2.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className="font-bold text-[12px] truncate">{value}</div>
    </div>
  );
}
