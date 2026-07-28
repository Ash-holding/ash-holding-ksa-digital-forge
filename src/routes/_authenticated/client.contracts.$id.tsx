import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSignature, PenLine, User, Calendar } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/client/contracts/$id")({
  component: ClientContractDetail,
});

function ClientContractDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["client-contract", id],
    queryFn: async () => (await api.get(`/contracts/${id}`)).data.contract,
    refetchInterval: 8000, refetchOnWindowFocus: true,
  });
  const c = q.data;

  const sign = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/request-sign`),
    onSuccess: () => { toast.success("تم إرسال طلب التوقيع"); qc.invalidateQueries({ queryKey: ["client-contract", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <DetailShell
      backTo="/client/contracts"
      icon={FileSignature}
      loading={q.isLoading}
      title={c ? <span className="font-mono" dir="ltr">{c.contractNumber}</span> : "—"}
      subtitle={c?.title}
      status={c && <StatusBadge value={c.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
      actions={c && c.status !== "SIGNED" && c.status !== "ACTIVE" && (
        <Button size="sm" className="gap-1.5" onClick={() => sign.mutate()}>
          <PenLine className="h-4 w-4" />التوقيع الإلكتروني
        </Button>
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
                <KV k="المشروع" v={c.project?.title} />
                <KV k="أُنشئ في" v={formatDate(c.createdAt)} />
              </div>
            </DetailSection>

            <DetailSection title="بنود العقد">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {c.description || "لا توجد تفاصيل إضافية"}
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
            <DetailSection title="الأطراف" icon={User}>
              <KV k="الطرف الأول" v="ASH HOLDING" />
              <KV k="الطرف الثاني" v={c.client?.user?.name} />
            </DetailSection>
            <DetailSection title="الحالة" icon={Calendar}>
              <KV k="حالة العقد" v={<StatusBadge value={c.status} />} />
              <KV k="آخر تحديث" v={formatDate(c.updatedAt)} />
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
