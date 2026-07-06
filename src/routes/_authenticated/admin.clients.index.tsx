import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Trash2, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/clients/")({
  component: ClientsPage,
});

type ClientRow = {
  id: string; companyName?: string | null; phone?: string | null; city?: string | null; country?: string;
  status: string; verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  lastIpCountry?: string | null; lastIpCity?: string | null; createdAt: string;
  user: { id: string; name: string; email: string; phone?: string | null; status: string; avatarUrl?: string | null };
};

const FILTERS = [
  { key: "", label: "الكل" },
  { key: "VERIFIED", label: "موثّق" },
  { key: "PENDING", label: "قيد المراجعة" },
  { key: "UNVERIFIED", label: "غير موثّق" },
  { key: "REJECTED", label: "مرفوض" },
] as const;

function VerificationBadge({ value }: { value: ClientRow["verificationStatus"] }) {
  const map = {
    VERIFIED: { Icon: ShieldCheck, label: "موثّق", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    PENDING: { Icon: ShieldQuestion, label: "قيد المراجعة", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    UNVERIFIED: { Icon: ShieldAlert, label: "غير موثّق", cls: "bg-foreground/10 text-foreground/70 border-border" },
    REJECTED: { Icon: ShieldAlert, label: "مرفوض", cls: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
  } as const;
  const { Icon, label, cls } = map[value] ?? map.UNVERIFIED;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold", cls)}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function CountryCell({ code, city }: { code?: string | null; city?: string | null }) {
  if (!code) return <span className="text-foreground/50 text-xs">—</span>;
  const flag = code.length === 2
    ? String.fromCodePoint(...code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0)))
    : "🌐";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="text-base leading-none">{flag}</span>
      <span className="text-foreground/80">{city || code}</span>
    </span>
  );
}

function ClientsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [verification, setVerification] = useState<string>("");

  const list = useQuery({
    queryKey: ["clients", { page, q, verification }],
    queryFn: async () => (await api.get("/clients", { params: { page, pageSize: 20, q, verification } })).data,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => { toast.success("تم تعطيل الحساب"); qc.invalidateQueries({ queryKey: ["clients"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const columns: Column<ClientRow>[] = [
    { key: "name", header: "العميل", render: (r) => (
      <div className="min-w-0 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-electric/10 text-electric text-xs font-black shrink-0">
          {r.user.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <div className="font-semibold truncate flex items-center gap-1.5">
            {r.user.name}
          </div>
          <div className="text-[11px] text-foreground/60 truncate" dir="ltr">{r.user.email}</div>
        </div>
      </div>
    ) },
    { key: "company", header: "الشركة", render: (r) => <span className="text-sm">{r.companyName || "—"}</span> },
    { key: "verification", header: "التوثيق", render: (r) => <VerificationBadge value={r.verificationStatus} /> },
    { key: "location", header: "الموقع", render: (r) => <CountryCell code={r.lastIpCountry || r.country} city={r.lastIpCity || r.city} /> },
    { key: "phone", header: "الجوال", render: (r) => <span dir="ltr" className="text-sm">{r.phone || r.user.phone || "—"}</span>, hideOnMobile: true },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge value={r.status} /> },
    { key: "created", header: "منذ", render: (r) => formatDate(r.createdAt), hideOnMobile: true },
    { key: "actions", header: "", render: (r) => (
      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog
          title="تعطيل حساب العميل"
          description="سيتم تعطيل الحساب ولن يستطيع تسجيل الدخول. يمكن إعادة تفعيله لاحقاً."
          onConfirm={async () => { await del.mutateAsync(r.id); }}
          trigger={<Button size="sm" variant="ghost" className="text-rose-400 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>}
        />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader
        icon={Users}
        title="العملاء"
        description="إدارة عملاء الشركة وحساباتهم وشركاتهم."
        actions={
          <Button className="gap-2" onClick={() => nav({ to: "/admin/clients/new" })}>
            <Plus className="h-4 w-4" /> عميل جديد
          </Button>
        }
      />

      {/* Quick verification filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key || "all"}
            onClick={() => { setVerification(f.key); setPage(1); }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-bold border transition",
              verification === f.key
                ? "bg-electric/15 text-electric border-electric/40"
                : "bg-card text-foreground/70 border-border hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
        <Link to="/admin/clients/new" className="ms-auto text-[11px] text-electric hover:underline">+ إضافة عميل</Link>
      </div>

      <DataTable<ClientRow>
        columns={columns}
        rows={list.data?.rows}
        loading={list.isLoading}
        total={list.data?.total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="بحث بالاسم أو البريد أو الشركة..."
        onRowClick={(r) => nav({ to: "/admin/clients/$id", params: { id: r.id } })}
        emptyTitle="لا يوجد عملاء بعد"
        emptyDescription="أضف عميلك الأول عبر الزر أعلاه."
      />
    </>
  );
}
