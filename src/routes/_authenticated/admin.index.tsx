import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatSAR, formatDate, fromNow } from "@/lib/format";
import { Users, FolderKanban, FileText, ScrollText, LifeBuoy, Wallet, LayoutDashboard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: OverviewPage,
});

const PIE_COLORS = ["#3b82f6", "#a855f7", "#06b6d4", "#f59e0b", "#f43f5e", "#10b981", "#6366f1", "#64748b"];

function OverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await api.get("/admin/stats")).data,
  });

  const c = data?.cards;
  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="نظرة عامة"
        description="ملخص أداء الشركة والعملاء والمشاريع خلال الشهر الحالي."
      />

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Users} label="إجمالي العملاء" value={c?.clientsTotal ?? 0} loading={isLoading} accent="electric" />
        <StatCard icon={FolderKanban} label="مشاريع نشطة" value={c?.activeProjects ?? 0} loading={isLoading} accent="purple" />
        <StatCard icon={FileText} label="فواتير غير مدفوعة" value={c?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" />
        <StatCard icon={ScrollText} label="عقود بانتظار التوقيع" value={c?.pendingContracts ?? 0} loading={isLoading} accent="cyan" />
        <StatCard icon={LifeBuoy} label="تذاكر مفتوحة" value={c?.openTickets ?? 0} loading={isLoading} accent="rose" />
        <StatCard icon={Wallet} label="إيرادات الشهر" value={formatSAR(c?.monthRevenue ?? 0)} loading={isLoading} accent="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">الإيرادات (آخر 6 أشهر)</h3>
            <span className="text-xs text-muted-foreground">ريال سعودي</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data?.revenueMonths ?? []}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} reversed />
                <YAxis stroke="#94a3b8" fontSize={11} orientation="right" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, direction: "rtl" }} />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Project statuses */}
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <h3 className="font-bold mb-3">توزيع حالات المشاريع</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data?.projectStatuses ?? []} dataKey="count" nameKey="status" innerRadius={40} outerRadius={80}>
                  {(data?.projectStatuses ?? []).map((_: unknown, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent lists */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentCard title="آخر العملاء" link="/admin/clients" empty="لا يوجد عملاء بعد">
          {data?.recentClients?.map((cl: any) => (
            <Link key={cl.id} to="/admin/clients/$id" params={{ id: cl.id }} className="block px-3 py-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{cl.user?.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{cl.companyName || cl.user?.email}</div>
                </div>
                <div className="text-[11px] text-muted-foreground shrink-0">{fromNow(cl.createdAt)}</div>
              </div>
            </Link>
          ))}
        </RecentCard>
        <RecentCard title="آخر الفواتير" link="/admin/invoices" empty="لا توجد فواتير">
          {data?.recentInvoices?.map((iv: any) => (
            <div key={iv.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-muted/50">
              <div className="min-w-0">
                <div className="text-sm font-semibold" dir="ltr">{iv.invoiceNumber}</div>
                <div className="text-[11px] text-muted-foreground truncate">{iv.client?.user?.name}</div>
              </div>
              <div className="text-left shrink-0">
                <div className="text-sm font-bold">{formatSAR(iv.total)}</div>
                <StatusBadge value={iv.status} />
              </div>
            </div>
          ))}
        </RecentCard>
        <RecentCard title="آخر التذاكر" link="/admin/support" empty="لا توجد تذاكر">
          {data?.recentTickets?.map((tk: any) => (
            <div key={tk.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-muted/50">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{tk.subject}</div>
                <div className="text-[11px] text-muted-foreground truncate">{tk.client?.user?.name} · {formatDate(tk.updatedAt)}</div>
              </div>
              <StatusBadge value={tk.status} />
            </div>
          ))}
        </RecentCard>
      </div>
    </>
  );
}

function RecentCard({ title, link, children, empty }: { title: string; link: string; children: React.ReactNode; empty: string }) {
  const kids = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">{title}</h3>
        <Link to={link as never} className="text-xs text-electric">عرض الكل ←</Link>
      </div>
      <div className="space-y-1">
        {kids && (Array.isArray(kids) ? kids.length : 0) > 0
          ? children
          : <div className="text-xs text-muted-foreground text-center py-6">{empty}</div>}
      </div>
    </div>
  );
}
