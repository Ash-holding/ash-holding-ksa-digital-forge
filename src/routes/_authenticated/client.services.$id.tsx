import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Send, CheckCircle2, Info } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { DetailShell, DetailSection, KV } from "@/components/shared/DetailShell";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/client/services/$id")({
  component: ClientServiceDetail,
});

function ClientServiceDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ["client-service", id],
    queryFn: async () => (await api.get(`/services/${id}`)).data.service,
    refetchInterval: 15000, refetchOnWindowFocus: true,
  });
  const s = q.data;

  const request = useMutation({
    mutationFn: () => api.post(`/services/${id}/request`, {}),
    onSuccess: () => { toast.success("تم إرسال الطلب"); nav({ to: "/client/projects" }); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <DetailShell
      backTo="/client/services"
      icon={Sparkles}
      loading={q.isLoading}
      title={s?.title ?? "—"}
      subtitle={s?.category}
      live
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
      actions={s && s.isActive && (
        <Button size="sm" className="gap-1.5" onClick={() => request.mutate()}>
          <Send className="h-4 w-4" />طلب الخدمة
        </Button>
      )}
    >
      {q.isLoading || !s ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <DetailSection title="نظرة عامة" icon={Info}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <KV k="السعر" v={s.basePrice ? <Money value={s.basePrice} className="text-electric font-black text-base" /> : "حسب الطلب"} />
                <KV k="التصنيف" v={s.category} />
                <KV k="المدة المتوقعة" v={s.durationDays ? `${s.durationDays} يوم` : "—"} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {s.description || "لا يوجد وصف تفصيلي"}
              </p>
            </DetailSection>

            {s.features && Array.isArray(s.features) && s.features.length > 0 && (
              <DetailSection title="المميزات" icon={CheckCircle2}>
                <ul className="space-y-2">
                  {s.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}
          </div>

          <div className="space-y-4">
            <DetailSection title="كيف تطلب؟">
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>اضغط "طلب الخدمة"</li>
                <li>سيتواصل معك فريقنا خلال ساعات</li>
                <li>يتم إنشاء مشروع ومتابعة التقدم</li>
              </ol>
            </DetailSection>
          </div>
        </div>
      )}
    </DetailShell>
  );
}
