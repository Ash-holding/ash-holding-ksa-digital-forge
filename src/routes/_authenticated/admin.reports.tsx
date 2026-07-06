import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Users, FolderKanban, FileText, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from "recharts";
import { formatSAR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "stats"], queryFn: async () => (await api.get("/admin/stats")).data });
  const c = data?.cards;
  return (
    <>
      <PageHeader icon={BarChart3} title="التقارير" description="مؤشرات الأداء الرئيسية والإيرادات." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="إجمالي العملاء" value={c?.clientsTotal ?? 0} loading={isLoading} accent="electric" />
        <StatCard icon={FolderKanban} label="مشاريع نشطة" value={c?.activeProjects ?? 0} loading={isLoading} accent="purple" />
        <StatCard icon={FileText} label="فواتير غير مدفوعة" value={c?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" />
        <StatCard icon={Wallet} label="إيرادات الشهر" value={formatSAR(c?.monthRevenue ?? 0)} loading={isLoading} accent="emerald" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-bold mb-3">إيرادات آخر 6 أشهر</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data?.revenueMonths ?? []}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} reversed />
                <YAxis stroke="#94a3b8" fontSize={11} orientation="right" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                <Bar dataKey="total" fill="#3b82f6" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-bold mb-3">اتجاه الإيرادات</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data?.revenueMonths ?? []}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} reversed />
                <YAxis stroke="#94a3b8" fontSize={11} orientation="right" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                <Line type="monotone" dataKey="total" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
