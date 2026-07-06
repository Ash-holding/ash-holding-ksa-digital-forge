import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Files, Upload, Trash2, Download } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/files")({
  component: FilesPage,
});

type Row = { id: string; originalName: string; mimeType: string; size: number; path: string; createdAt: string;
  uploader: { name: string }; project?: { title: string } | null; contract?: { contractNumber: string } | null };

function FilesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = useQuery({ queryKey: ["files", page], queryFn: async () => (await api.get("/files", { params: { page } })).data });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append("file", file);
      return api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { toast.success("تم رفع الملف"); qc.invalidateQueries({ queryKey: ["files"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/files/${id}`), onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["files"] }); } });

  const columns: Column<Row>[] = [
    { key: "name", header: "الاسم", render: (r) => (
      <div className="min-w-0">
        <div className="font-semibold truncate">{r.originalName}</div>
        <div className="text-[11px] text-muted-foreground truncate">{r.mimeType}</div>
      </div>
    ) },
    { key: "size", header: "الحجم", render: (r) => `${(r.size / 1024).toFixed(1)} KB` },
    { key: "by", header: "بواسطة", render: (r) => r.uploader.name, hideOnMobile: true },
    { key: "date", header: "التاريخ", render: (r) => formatDate(r.createdAt), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <a href={r.path} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted">
          <Download className="h-4 w-4" />
        </a>
        <ConfirmDialog title="حذف الملف" onConfirm={async () => { await del.mutateAsync(r.id); }}
          trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>} />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader icon={Files} title="الملفات" description="جميع الملفات المرفوعة على السيرفر تحت /uploads."
        actions={
          <>
            <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
            <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="gap-2">
              <Upload className="h-4 w-4" /> {upload.isPending ? "جارٍ الرفع..." : "رفع ملف"}
            </Button>
          </>
        } />
      <DataTable<Row> columns={columns} rows={list.data?.rows} loading={list.isLoading}
        total={list.data?.total} page={page} pageSize={20} onPageChange={setPage} />
    </>
  );
}
