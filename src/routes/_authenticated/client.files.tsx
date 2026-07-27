import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Files, Upload, Download, HardDrive, Image as ImageIcon, FileText, Calendar } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/client/files")({
  component: ClientFilesPage,
});

function formatBytes(b: number) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

function ClientFilesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const list = useQuery({
    queryKey: ["client-files", page],
    queryFn: async () => (await api.get("/files", { params: { page } })).data,
    refetchInterval: 20000,
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append("file", file);
      return api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { toast.success("تم رفع الملف"); qc.invalidateQueries({ queryKey: ["client-files"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const rows = (list.data?.rows ?? []) as any[];
  const stats = useMemo(() => {
    const total = rows.length;
    const totalSize = rows.reduce((s, r) => s + Number(r.size ?? 0), 0);
    const images = rows.filter((r) => /^image\//i.test(r.mimeType ?? "") || /\.(png|jpe?g|gif|webp|svg)$/i.test(r.originalName ?? "")).length;
    const docs = total - images;
    const week = Date.now() - 7 * 86400000;
    const recent = rows.filter((r) => new Date(r.createdAt).getTime() >= week).length;
    return { total, totalSize, images, docs, recent };
  }, [rows]);

  const columns: Column<any>[] = [
    { key: "name", header: "الاسم", render: (r) => <div className="font-semibold truncate">{r.originalName}</div> },
    { key: "size", header: "الحجم", render: (r) => formatBytes(r.size) },
    { key: "date", header: "التاريخ", render: (r) => formatDate(r.createdAt), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <a href={r.path} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted/50">
        <Download className="h-4 w-4" />
      </a>
    ) },
  ];

  return (
    <div className="space-y-3">
      <ClientPageHeader
        icon={Files}
        title="ملفاتي"
        description="جميع ملفاتك المرفوعة — يمكنك الرفع والتنزيل بسهولة."
        actions={
          <>
            <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
            <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="gap-2" size="sm">
              <Upload className="h-4 w-4" /> {upload.isPending ? "..." : "رفع"}
            </Button>
          </>
        }
      />
      <AdminStatsRow
        loading={list.isLoading}
        stats={[
          { icon: Files, label: "إجمالي الملفات", value: stats.total, accent: "electric" },
          { icon: HardDrive, label: "الحجم الكلي", value: formatBytes(stats.totalSize), accent: "purple" },
          { icon: ImageIcon, label: "صور", value: stats.images, accent: "cyan" },
          { icon: FileText, label: "مستندات", value: stats.docs, accent: "amber" },
          { icon: Calendar, label: "رُفعت هذا الأسبوع", value: stats.recent, accent: "emerald" },
        ]}
      />
      <DataTable
        columns={columns} rows={rows} loading={list.isLoading}
        total={list.data?.total} page={page} pageSize={20} onPageChange={setPage}
        emptyTitle="لا توجد ملفات"
      />
    </div>
  );
}
