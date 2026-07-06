import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, FolderKanban, FileText, Wallet, Download, Percent, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

const PIE_COLORS = ["#3b82f6", "#a855f7", "#06b6d4", "#f59e0b", "#f43f5e", "#10b981"];

type Stats = {
  cards: { clientsTotal: number; activeProjects: number; unpaidInvoices: number; pendingContracts: number; openTickets: number; monthRevenue: number };
  kpis: { collectionsRate: number; avgProjectProgress: number; newClientsThisMonth: number; overdueAmount: number; activeContractsValue: number; avgTicketResponseHours: number };
  revenueMonths: Array<{ month: string; total: number; target: number; invoices: number }>;
  invoiceStatuses: Array<{ status: string; count: number; total: number }>;
  projectStatuses: Array<{ status: string; count: number }>;
  topClients: Array<{ id: string; name: string | null; revenue: number; projects: number }>;
};

function toCsv(data: Stats): string {
  const lines = ["الشهر,الإيرادات,المستهدف,عدد الفواتير"];
  for (const m of data.revenueMonths) lines.push(`${m.month},${m.total},${m.target},${m.invoices}`);
  return "\uFEFF" + lines.join("\n");
}

function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await api.get("/admin/stats")).data as Stats,
    refetchInterval: 30000, refetchOnWindowFocus: true,
  });

  const exportCsv = () => {
    if (!data) return;
    const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `revenue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const c = data?.cards;
  const k = data?.kpis;

  return (
    <>
      <PageHeader icon={BarChart3} title="التقارير" description="مؤشرات الأداء الرئيسية والإيرادات — لوحة تحليلية شاملة."
        actions={<Button variant="outline" onClick={exportCsv} className="gap-2" disabled={!data}><Download className="h-4 w-4" />تصدير CSV</Button>}
      />

      <AdminStatsRow loading={isLoading} stats={[
        { icon: Users, label: "إجمالي العملاء", value: c?.clientsTotal ?? 0, accent: "electric" },
        { icon: FolderKanban, label: "مشاريع نشطة", value: c?.activeProjects ?? 0, accent: "purple" },
        { icon: FileText, label: "فواتير غير مدفوعة", value: c?.unpaidInvoices ?? 0, accent: "amber" },
        { icon: Wallet, label: "إيرادات الشهر", value: <Money value={c?.monthRevenue ?? 0} />, accent: "emerald", spark: (data?.revenueMonths ?? []).map((m) => m.total) },
        { icon: Percent, label: "معدل التحصيل", value: `${k?.collectionsRate ?? 0}%`, accent: "cyan" },
        { icon: Activity, label: "متوسط تقدم المشاريع", value: `${k?.avgProjectProgress ?? 0}%`, accent: "rose" },
      ]} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="إيرادات آخر 6 أشهر">
          <BarChart data={data?.revenueMonths ?? []}>
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} reversed />
            <YAxis stroke="#94a3b8" fontSize={11} orientation="right" />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
            <Bar dataKey="total" fill="#3b82f6" radius={[6,6,0,0]} name="فعلي" />
            <Bar dataKey="target" fill="#a855f7" radius={[6,6,0,0]} opacity={0.5} name="مستهدف" />
          </BarChart>
        </ChartCard>

        <ChartCard title="اتجاه الإيرادات">
          <LineChart data={data?.revenueMonths ?? []}>
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} reversed />
            <YAxis stroke="#94a3b8" fontSize={11} orientation="right" />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
            <Line type="monotone" dataKey="total" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="توزيع حالات الفواتير">
          <PieChart>
            <Pie data={data?.invoiceStatuses ?? []} dataKey="count" nameKey="status" innerRadius={45} outerRadius={80} paddingAngle={2}>
              {(data?.invoiceStatuses ?? []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="توزيع حالات المشاريع">
          <BarChart data={data?.projectStatuses ?? []} layout="vertical">
            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
            <YAxis type="category" dataKey="status" stroke="#94a3b8" fontSize={11} width={80} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
            <Bar dataKey="count" fill="#06b6d4" radius={[0,6,6,0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold mb-3">أفضل 5 عملاء إيراداً</h3>
        <div className="space-y-2">
          {(data?.topClients ?? []).map((tc) => (
            <div key={tc.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2">
              <div className="min-w-0 truncate font-semibold">{tc.name || "—"}</div>
              <div className="flex items-center gap-4 text-xs shrink-0">
                <span className="text-muted-foreground">{tc.projects} مشروع</span>
                <Money value={tc.revenue} className="font-bold text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <h3 className="font-bold mb-3">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
