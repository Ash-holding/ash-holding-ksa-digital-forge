import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Files, Upload, Download } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/client/files")({
  component: () => {
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const inputRef = useRef<HTMLInputElement>(null);
    const list = useQuery({ queryKey: ["client-files", page], queryFn: async () => (await api.get("/files", { params: { page } })).data });
    const upload = useMutation({
      mutationFn: async (file: File) => {
        const fd = new FormData(); fd.append("file", file);
        return api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      },
      onSuccess: () => { toast.success("تم رفع الملف"); qc.invalidateQueries({ queryKey: ["client-files"] }); },
      onError: (e) => toast.error(apiError(e)),
    });
    const columns: Column<any>[] = [
      { key: "name", header: "الاسم", render: (r) => <div className="font-semibold">{r.originalName}</div> },
      { key: "size", header: "الحجم", render: (r) => `${(r.size / 1024).toFixed(1)} KB` },
      { key: "date", header: "التاريخ", render: (r) => formatDate(r.createdAt), hideOnMobile: true },
      { key: "actions", header: "", render: (r) => (
        <a href={r.path} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg border border-border">
          <Download className="h-4 w-4" />
        </a>
      ) },
    ];
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Files className="h-5 w-5 text-electric" /><h1 className="text-xl font-black">ملفاتي</h1></div>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
          <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="gap-2">
            <Upload className="h-4 w-4" /> {upload.isPending ? "..." : "رفع"}
          </Button>
        </div>
        <DataTable columns={columns} rows={list.data?.rows} loading={list.isLoading}
          total={list.data?.total} page={page} pageSize={20} onPageChange={setPage} emptyTitle="لا توجد ملفات" />
      </>
    );
  },
});
