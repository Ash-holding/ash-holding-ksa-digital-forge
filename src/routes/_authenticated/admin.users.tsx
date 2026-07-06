import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { UserCog, Plus, Trash2, ShieldCheck, ShieldOff, Users2, Zap } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { FormSheet } from "@/components/dashboard/FormSheet";
import { AdminStatsRow } from "@/components/admin/AdminStatsRow";
import { FilterChips } from "@/components/admin/FilterChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type Row = { id: string; name: string; email: string; role: string; status: string; phone?: string | null; lastLoginAt?: string | null; lastIpAddress?: string | null };
type Stats = { total: number; active: number; disabled: number; admins: number; loggedIn24h: number };

function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["users", page],
    queryFn: async () => (await api.get("/users", { params: { page } })).data,
    refetchInterval: 20000, refetchOnWindowFocus: true,
  });
  const stats = list.data?.stats as Stats | undefined;
  const rows = (list.data?.rows ?? []) as Row[];
  const filtered = useMemo(() => (role ? rows.filter((r) => r.role === role) : rows), [rows, role]);

  const del = useMutation({ mutationFn: (id: string) => api.delete(`/users/${id}`), onSuccess: () => { toast.success("تم تعطيل الحساب"); qc.invalidateQueries({ queryKey: ["users"] }); } });
  const create = useMutation({
    mutationFn: (d: Record<string, unknown>) => api.post("/users", d),
    onSuccess: () => { toast.success("تم إنشاء المستخدم"); qc.invalidateQueries({ queryKey: ["users"] }); setOpen(false); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<Row>[] = [
    { key: "name", header: "الاسم", render: (r) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 shrink-0 grid place-items-center rounded-full bg-electric/10 text-electric text-xs font-bold">
          {r.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{r.name}</div>
          <div className="text-[11px] text-muted-foreground truncate" dir="ltr">{r.email}</div>
        </div>
      </div>
    ) },
    { key: "role", header: "الدور", render: (r) => <StatusBadge value={r.role} /> },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "phone", header: "الجوال", render: (r) => <span dir="ltr">{r.phone || "—"}</span>, hideOnMobile: true },
    { key: "ip", header: "آخر IP", render: (r) => <span dir="ltr" className="font-mono text-xs">{r.lastIpAddress || "—"}</span>, hideOnMobile: true },
    { key: "login", header: "آخر دخول", render: (r) => formatDate(r.lastLoginAt), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <ConfirmDialog title="تعطيل الحساب" onConfirm={async () => { await del.mutateAsync(r.id); }}
        trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>} />
    ) },
  ];

  return (
    <>
      <PageHeader icon={UserCog} title="المستخدمون" description="فريق العمل، الصلاحيات وآخر النشاط."
        actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />مستخدم جديد</Button>} />

      <AdminStatsRow loading={list.isLoading} stats={[
        { icon: Users2, label: "إجمالي المستخدمين", value: stats?.total ?? 0, accent: "electric" },
        { icon: ShieldCheck, label: "نشط", value: stats?.active ?? 0, accent: "emerald" },
        { icon: ShieldOff, label: "موقوف", value: stats?.disabled ?? 0, accent: "rose" },
        { icon: UserCog, label: "مدراء", value: stats?.admins ?? 0, accent: "purple" },
        { icon: Zap, label: "نشط آخر 24س", value: stats?.loggedIn24h ?? 0, accent: "cyan" },
      ]} />

      <FilterChips value={role} onChange={setRole} chips={[
        { key: "", label: "الكل", count: stats?.total },
        { key: "SUPER_ADMIN", label: "مدير عام" },
        { key: "ADMIN", label: "مدير" },
        { key: "SUPPORT", label: "دعم" },
        { key: "ACCOUNTANT", label: "محاسب" },
      ]} />

      <DataTable<Row> columns={columns} rows={filtered} loading={list.isLoading}
        total={filtered.length} page={page} pageSize={20} onPageChange={setPage}
        emptyTitle="لا يوجد مستخدمون" />

      <FormSheet open={open} onOpenChange={setOpen} title="مستخدم جديد" submitText="إنشاء"
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          const raw = Object.fromEntries(fd.entries());
          await create.mutateAsync(raw);
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>الاسم *</Label><Input name="name" required /></div>
          <div className="space-y-1.5"><Label>البريد *</Label><Input dir="ltr" type="email" name="email" required /></div>
          <div className="space-y-1.5"><Label>كلمة السر *</Label><Input dir="ltr" type="password" name="password" required minLength={8} /></div>
          <div className="space-y-1.5"><Label>الجوال</Label><Input dir="ltr" name="phone" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>الدور *</Label>
            <select name="role" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["ADMIN","SUPPORT","ACCOUNTANT","SUPER_ADMIN"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </FormSheet>
    </>
  );
}
