import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LayoutDashboard, FolderKanban, Boxes, FileText, ScrollText, LifeBuoy, Bell, Files } from "lucide-react";
import { api } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/client/")({
  component: ClientOverview,
});

function ClientOverview() {
  const { data, isLoading } = useQuery({ queryKey: ["client", "overview"], queryFn: async () => (await api.get("/clients/me/overview")).data });
  const s = data?.stats;
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-3xl border border-border bg-gradient-to-br from-electric/10 via-transparent to-purple-accent/10 p-5 md:p-6">
          <div className="text-xs text-muted-foreground flex items-center gap-2"><LayoutDashboard className="h-3.5 w-3.5" />بوابة العميل</div>
          <h1 className="mt-1 text-xl md:text-2xl font-black">مرحباً بك في ASH HOLDING 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">تابع مشاريعك، فواتيرك، عقودك، وتذاكر الدعم من مكان واحد.</p>
        </div>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={FolderKanban} label="مشاريع نشطة" value={s?.activeProjects ?? 0} loading={isLoading} accent="electric" />
        <StatCard icon={Boxes} label="خدمات نشطة" value={s?.activeServices ?? 0} loading={isLoading} accent="purple" />
        <StatCard icon={FileText} label="فواتير مستحقة" value={s?.unpaidInvoices ?? 0} loading={isLoading} accent="amber" />
        <StatCard icon={ScrollText} label="عقود بانتظار التوقيع" value={s?.pendingContracts ?? 0} loading={isLoading} accent="cyan" />
        <StatCard icon={LifeBuoy} label="تذاكر مفتوحة" value={s?.openTickets ?? 0} loading={isLoading} accent="rose" />
        <StatCard icon={Bell} label="إشعارات غير مقروءة" value={s?.unreadNotifications ?? 0} loading={isLoading} accent="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">آخر المشاريع</h3>
            <Link to="/client/projects" className="text-xs text-electric">الكل ←</Link>
          </div>
          <div className="space-y-2">
            {data?.recentProjects?.length ? data.recentProjects.map((p: any) => (
              <div key={p.id} className="rounded-xl bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">الاستحقاق: {formatDate(p.dueDate)}</div>
                  </div>
                  <StatusBadge value={p.status} />
                </div>
                <Progress value={p.progress} className="h-1.5 mt-2" />
              </div>
            )) : <div className="text-xs text-muted-foreground text-center py-6">لا توجد مشاريع بعد</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-2"><Files className="h-4 w-4" />آخر الملفات</h3>
            <Link to="/client/files" className="text-xs text-electric">الكل ←</Link>
          </div>
          <div className="space-y-2">
            {data?.recentFiles?.length ? data.recentFiles.map((f: any) => (
              <a key={f.id} href={f.path} target="_blank" rel="noreferrer" className="block rounded-xl bg-muted/30 p-3 hover:bg-muted/50">
                <div className="text-sm font-semibold truncate">{f.originalName}</div>
                <div className="text-[11px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB · {formatDate(f.createdAt)}</div>
              </a>
            )) : <div className="text-xs text-muted-foreground text-center py-6">لا توجد ملفات بعد</div>}
          </div>
        </div>
      </div>
    </>
  );
}
