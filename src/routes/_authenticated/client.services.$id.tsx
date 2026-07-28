import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Calendar, Info, Package, LifeBuoy } from "lucide-react";
import { api } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/client/services/$id")({
  component: ClientServiceDetail,
});

function ClientServiceDetail() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["client-service", id],
    queryFn: async () => (await api.get(`/services/${id}`)).data.service,
    refetchInterval: 10000, refetchOnWindowFocus: true,
  });
  const s = q.data;

  return (
    <DetailShell
      backTo="/client/services"
      icon={Boxes}
      loading={q.isLoading}
      title={s?.name ?? "—"}
      subtitle={s?.type}
      status={s && <StatusBadge value={s.status} />}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
    >
      {q.isLoading || !s ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <DetailSection title="بيانات الخدمة" icon={Package}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <KV k="السعر" v={s.price ? <Money value={s.price} className="text-electric font-black text-base" /> : "—"} />
                <KV k="النوع" v={s.type} />
                <KV k="العملة" v={s.currency} />
                <KV k="تاريخ البدء" v={formatDate(s.startedAt)} />
                <KV k="التجديد القادم" v={formatDate(s.renewalDate)} />
                <KV k="تاريخ الانتهاء" v={formatDate(s.endedAt)} />
                <KV k="المشروع" v={s.project?.title} />
              </div>
            </DetailSection>

            <DetailSection title="ملاحظات" icon={Info}>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {s.notes || "لا توجد ملاحظات"}
              </p>
            </DetailSection>
          </div>

          <div className="space-y-4">
            <DetailSection title="الحالة" icon={Calendar}>
              <KV k="حالة الاشتراك" v={<StatusBadge value={s.status} />} />
              <KV k="أُنشئت" v={formatDate(s.createdAt)} />
              <KV k="آخر تحديث" v={formatDate(s.updatedAt)} />
            </DetailSection>
            <DetailSection title="بحاجة لدعم؟" icon={LifeBuoy}>
              <p className="text-xs text-muted-foreground">
                افتح تذكرة دعم من قسم الدعم وسنساعدك خلال ساعات عمل.
              </p>
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
