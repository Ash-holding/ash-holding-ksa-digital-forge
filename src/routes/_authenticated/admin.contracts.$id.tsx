import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileSignature, Trash2, User, Calendar, Send, StickyNote, Download, ShieldCheck } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { formatDate } from "@/lib/format";
import { downloadContractPDF } from "@/lib/contract-print";

export const Route = createFileRoute("/_authenticated/admin/contracts/$id")({
  component: AdminContractDetail,
});

function AdminContractDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["contract", id],
    queryFn: async () => (await api.get(`/contracts/${id}`)).data,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const c = q.data?.contract;
  const linkedRequest = q.data?.linkedRequest ?? null;
  const paidInvoice = q.data?.paidInvoice ?? null;
  const [title, setTitle] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const patch = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.patch(`/contracts/${id}`, d),
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["contract", id] }); qc.invalidateQueries({ queryKey: ["contracts"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const del = useMutation({
    mutationFn: () => api.delete(`/contracts/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["contracts"] }); nav({ to: "/admin/contracts" }); },
  });
  const requestSign = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/request-sign`),
    onSuccess: () => toast.success("تم إرسال طلب التوقيع"),
  });

  const handleDownload = async () => {
    if (!c) return;
    try { await downloadContractPDF(c, linkedRequest, paidInvoice); toast.success("تم تحميل العقد"); }
    catch { toast.error("تعذّر إنشاء ملف PDF"); }
  };

  return (
    <DetailShell
      backTo="/admin/contracts"
      icon={FileSignature}
      loading={q.isLoading}
      title={c ? <span className="font-mono" dir="ltr">{c.contractNumber}</span> : "—"}
      subtitle={c?.title}
      status={c && <StatusBadge value={c.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
      actions={c && (
        <>
          <Button size="sm" className="gap-1.5 bg-gradient-to-r from-electric to-plasma text-white" onClick={handleDownload}>
            <Download className="h-4 w-4" /> تحميل PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => requestSign.mutate()}>
            <Send className="h-4 w-4" />طلب توقيع
          </Button>
          <ConfirmDialog title="حذف العقد" onConfirm={async () => { await del.mutateAsync(); }}
            trigger={<Button size="icon" variant="ghost" className="text-rose-400"><Trash2 className="h-4 w-4" /></Button>} />
        </>
      )}
    >

      {q.isLoading || !c ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <DetailSection title="بيانات العقد" icon={FileSignature}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <KV k="القيمة" v={<Money value={c.value ?? 0} className="text-electric font-black text-base" />} />
                <KV k="تاريخ البدء" v={formatDate(c.startDate)} />
                <KV k="تاريخ الانتهاء" v={formatDate(c.endDate)} />
                <KV k="المدة" v={c.durationMonths ? `${c.durationMonths} شهر` : "—"} />
                <KV k="الحالة" v={<StatusBadge value={c.status} />} />
                <KV k="المشروع" v={c.project?.title} />
              </div>
            </DetailSection>

            <DetailSection title="الوصف">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {c.description || "لا يوجد وصف"}
              </p>
            </DetailSection>

            <DetailSection title="المرفقات">
              {(c.files ?? []).length ? (
                <ul className="space-y-1.5 text-sm">
                  {c.files.map((f: any) => (
                    <li key={f.id} className="flex items-center justify-between border-b border-border/40 pb-1.5">
                      <span>{f.name}</span>
                      <a href={f.url} target="_blank" rel="noreferrer" className="text-electric hover:underline text-xs">تحميل</a>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-muted-foreground text-center py-4">لا مرفقات</p>}
            </DetailSection>
          </div>

          <div className="space-y-4">
            <DetailSection title="العميل" icon={User}>
              <KV k="الاسم" v={c.client?.user?.name} />
              <KV k="البريد" v={c.client?.user?.email} mono dir="ltr" />
              <KV k="الهاتف" v={c.client?.user?.phone} mono dir="ltr" />
            </DetailSection>

            <DetailSection title="تحكم الأدمن" icon={Calendar}>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">الحالة</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["DRAFT", "PENDING_SIGN", "SIGNED", "ACTIVE", "EXPIRED", "CANCELLED"].map((s) => (
                      <Button key={s} size="sm" variant={c.status === s ? "default" : "outline"} className="h-7 text-xs" onClick={() => patch.mutate({ status: s })}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">العنوان</label>
                  <Input defaultValue={c.title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70">القيمة</label>
                  <Input type="number" step="0.01" defaultValue={c.value ?? 0} onChange={(e) => setValue(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/70 flex items-center gap-1"><StickyNote className="h-3 w-3" /> ملاحظات</label>
                  <Textarea rows={3} defaultValue={c.notes ?? ""} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
                </div>
                <Button size="sm" className="w-full" onClick={() => patch.mutate({
                  title: title || undefined, value: value ? Number(value) : undefined, notes: notes || undefined,
                })}>حفظ التغييرات</Button>
              </div>
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
