import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/affiliate/customers")({
  component: CustomersPage,
});

type Customer = {
  id: string; clientId: string; createdAt: string;
  firstOrderAt?: string | null; totalOrders?: number; totalRevenue?: string | number;
};

function CustomersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-customers"],
    queryFn: async () => (await api.get("/affiliate/customers")).data as { items: Customer[] },
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">العملاء المُحالون</h1>
        <p className="text-sm text-muted-foreground">قائمة بجميع العملاء الذين انضموا عبر رابط إحالتك.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="font-semibold">لا يوجد عملاء محالون بعد</div>
          <div className="text-sm text-muted-foreground mt-1">شارك رابط الإحالة لجذب أول عميل</div>
        </div>
      ) : (
        <div className="grid gap-2">
          {data.items.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card/40 p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-mono">{c.clientId.slice(-8).toUpperCase()}</div>
                <div className="text-xs text-muted-foreground">انضم: {formatDate(c.createdAt)}</div>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold tabular-nums">{c.totalOrders ?? 0} طلب</div>
                <div className="text-xs text-emerald-500 tabular-nums">{Number(c.totalRevenue ?? 0).toFixed(2)} ر.س</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
