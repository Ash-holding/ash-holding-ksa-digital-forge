import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Files, Upload, Trash2, Download, Image, FileText, Archive, HardDrive } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/files")({
  component: FilesPage,
});

type Row = { id: string; originalName: string; mimeType: string; size: number; path: string; createdAt: string; uploader: { name: string }; project?: { title: string } | null; contract?: { contractNumber: string } | null };
type Stats = { total: number; totalSize: number; images: number; documents: number; archives: number };

const humanSize = (n: number) => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`;
const kindOf = (mime: string) => mime.startsWith("image/") ? "image" : (mime.includes("zip") || mime.includes("rar")) ? "archive" : (mime.includes("pdf") || mime.includes("document") || mime.includes("text")) ? "doc" : "other";

function FilesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = useQuery({
    queryKey: ["files", page],
    queryFn: async () => (await api.get("/files", { params: { page } })).data,
    refetchInterval: 30000, refetchOnWindowFocus: true,
  });
  const stats = list.data?.stats as Stats | undefined;
  const rows = (list.data?.rows ?? []) as Row[];
  const filtered = useMemo(() => (kind ? rows.filter((r) => kindOf(r.mimeType) === kind) : rows), [rows, kind]);

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
    { key: "size", header: "الحجم", render: (r) => humanSize(r.size) },
    { key: "linked", header: "مرتبط بـ", render: (r) => r.project?.title || r.contract?.contractNumber || "—", hideOnMobile: true },
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
      <PageHeader icon={Files} title="الملفات" description="جميع الملفات المرفوعة على السيرفر مع تصنيف ومساحة."
        actions={
          <>
            <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
            <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="gap-2">
              <Upload className="h-4 w-4" /> {upload.isPending ? "جارٍ الرفع..." : "رفع ملف"}
            </Button>
          </>
        } />

      <AdminStatsRow loading={list.isLoading} stats={[
        { icon: Files, label: "إجمالي الملفات", value: stats?.total ?? 0, accent: "electric" },
        { icon: HardDrive, label: "المساحة المستخدمة", value: humanSize(stats?.totalSize ?? 0), accent: "purple" },
        { icon: Image, label: "صور", value: stats?.images ?? 0, accent: "cyan" },
        { icon: FileText, label: "مستندات", value: stats?.documents ?? 0, accent: "emerald" },
        { icon: Archive, label: "أرشيفات", value: stats?.archives ?? 0, accent: "amber" },
      ]} />

      <FilterChips value={kind} onChange={setKind} chips={[
        { key: "", label: "الكل", count: stats?.total },
        { key: "image", label: "صور", count: stats?.images },
        { key: "doc", label: "مستندات", count: stats?.documents },
        { key: "archive", label: "أرشيفات", count: stats?.archives },
        { key: "other", label: "أخرى" },
      ]} />

      <DataTable<Row> columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        emptyTitle="لا توجد ملفات بعد" />
    </>
  );
}
