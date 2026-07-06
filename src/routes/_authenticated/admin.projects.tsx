import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { FormSheet } from "@/components/dashboard/FormSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { Money } from "@/components/ui/money";

export const Route = createFileRoute("/_authenticated/admin/projects")({
  component: ProjectsPage,
});

type Row = { id: string; title: string; status: string; progress: number; budget?: string | null;
  dueDate?: string | null; client: { id: string; user: { name: string; email: string } } };

function ProjectsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["projects", { page, q }],
    queryFn: async () => (await api.get("/projects", { params: { page, pageSize: 20, q } })).data,
  });
  const clients = useQuery({
    queryKey: ["clients-lite"], queryFn: async () => (await api.get("/clients", { params: { pageSize: 100 } })).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["projects"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/projects", data),
    onSuccess: () => { toast.success("تم إنشاء المشروع"); qc.invalidateQueries({ queryKey: ["projects"] }); setOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<Row>[] = [
    { key: "title", header: "المشروع", render: (r) => (
      <Link to="/admin/clients/$id" params={{ id: r.client.id }} className="min-w-0 block hover:text-electric">
        <div className="font-semibold truncate">{r.title}</div>
        <div className="text-[11px] text-muted-foreground truncate">{r.client.user.name}</div>
      </Link>
    ) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "progress", header: "التقدم", render: (r) => (
      <div className="min-w-[100px]">
        <Progress value={r.progress} className="h-1.5" />
        <div className="text-[10px] text-muted-foreground mt-1">{r.progress}%</div>
      </div>
    ) },
    { key: "budget", header: "الميزانية", render: (r) => r.budget ? <Money value={r.budget} /> : "—", hideOnMobile: true },
    { key: "due", header: "الاستحقاق", render: (r) => formatDate(r.dueDate), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <div onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog
          title="حذف المشروع" description="سيتم حذف المشروع نهائياً."
          onConfirm={async () => { await del.mutateAsync(r.id); }}
          trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>}
        />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader icon={FolderKanban} title="المشاريع" description="متابعة جميع مشاريع العملاء وحالتها ونسب الإنجاز."
        actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />مشروع جديد</Button>}
      />
      <DataTable<Row>
        columns={columns} rows={list.data?.rows} loading={list.isLoading}
        total={list.data?.total} page={page} pageSize={20} onPageChange={setPage}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        emptyTitle="لا توجد مشاريع بعد"
      />
      <FormSheet open={open} onOpenChange={setOpen} title="مشروع جديد" submitText="إنشاء"
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          const raw = Object.fromEntries(fd.entries());
          await create.mutateAsync({
            ...raw,
            progress: Number(raw.progress || 0),
            budget: raw.budget ? Number(raw.budget) : undefined,
          });
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>العميل *</Label>
            <select name="clientId" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">اختر العميل</option>
              {clients.data?.rows?.map((c: any) => <option key={c.id} value={c.id}>{c.user.name} — {c.companyName || c.user.email}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>عنوان المشروع *</Label><Input name="title" required /></div>
          <div className="space-y-1.5"><Label>الوصف</Label><Textarea name="description" rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>الحالة</Label>
              <select name="status" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {["NEW","PLANNING","DESIGN","DEVELOPMENT","WAITING_CLIENT","TESTING","COMPLETED","ON_HOLD"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>التقدم %</Label><Input name="progress" type="number" min={0} max={100} defaultValue={0} /></div>
            <div className="space-y-1.5"><Label>الميزانية (ر.س)</Label><Input name="budget" type="number" step="0.01" /></div>
            <div className="space-y-1.5"><Label>تاريخ الاستحقاق</Label><Input name="dueDate" type="date" /></div>
          </div>
        </div>
      </FormSheet>
    </>
  );
}
