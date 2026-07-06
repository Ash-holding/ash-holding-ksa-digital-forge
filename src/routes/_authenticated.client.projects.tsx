import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FolderKanban } from "lucide-react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { formatSAR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/client/projects")({
  component: () => {
    const [page, setPage] = useState(1);
    const list = useQuery({ queryKey: ["client-projects", page], queryFn: async () => (await api.get("/projects", { params: { page } })).data });
    const columns: Column<any>[] = [
      { key: "title", header: "المشروع", render: (r) => <div className="font-semibold">{r.title}</div> },
      { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
      { key: "progress", header: "التقدم", render: (r) => (
        <div className="min-w-[120px]"><Progress value={r.progress} className="h-1.5" /><div className="text-[10px] text-muted-foreground mt-1">{r.progress}%</div></div>
      ) },
      { key: "budget", header: "الميزانية", render: (r) => r.budget ? formatSAR(r.budget) : "—", hideOnMobile: true },
      { key: "due", header: "الاستحقاق", render: (r) => formatDate(r.dueDate), hideOnMobile: true },
    ];
    return (
      <>
        <div className="flex items-center gap-2"><FolderKanban className="h-5 w-5 text-electric" /><h1 className="text-xl font-black">مشاريعي</h1></div>
        <DataTable columns={columns} rows={list.data?.rows} loading={list.isLoading}
          total={list.data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="لا توجد مشاريع بعد" />
      </>
    );
  },
});
