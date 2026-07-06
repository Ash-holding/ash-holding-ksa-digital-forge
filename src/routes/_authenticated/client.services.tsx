import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Boxes } from "lucide-react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

const TYPE_AR: Record<string, string> = { WEBSITE:"موقع", MOBILE_APP:"تطبيق", ADMIN_SYSTEM:"نظام", HOSTING:"استضافة", VPS:"VPS", DEDICATED_SERVER:"سيرفر", SMTP:"SMTP", MARKETING:"تسويق", DESIGN:"تصميم", SUPPORT:"دعم", OTHER:"أخرى" };

export const Route = createFileRoute("/_authenticated/client/services")({
  component: () => {
    const [page, setPage] = useState(1);
    const list = useQuery({ queryKey: ["client-services", page], queryFn: async () => (await api.get("/services", { params: { page } })).data });
    const columns: Column<any>[] = [
      { key: "name", header: "الخدمة", render: (r) => <div className="font-semibold">{r.name}</div> },
      { key: "type", header: "النوع", render: (r) => TYPE_AR[r.type] || r.type },
      { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
      { key: "price", header: "السعر", render: (r) => r.price ? <Money value={r.price} /> : "—" },
      { key: "renewal", header: "التجديد", render: (r) => formatDate(r.renewalDate), hideOnMobile: true },
    ];
    return (
      <>
        <div className="flex items-center gap-2"><Boxes className="h-5 w-5 text-electric" /><h1 className="text-xl font-black">خدماتي</h1></div>
        <DataTable columns={columns} rows={list.data?.rows} loading={list.isLoading}
          total={list.data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="لا توجد خدمات نشطة" />
      </>
    );
  },
});
