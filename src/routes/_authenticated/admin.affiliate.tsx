import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Handshake, Users, Percent, Banknote, Megaphone, Clock, RefreshCw, CheckCircle2, XCircle, PauseCircle, Play, TrendingUp, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/affiliate")({
  head: () => ({
    meta: [
      { title: "التسويق بالعمولة — لوحة الإدارة | ASH HOLDING" },
      { name: "description", content: "إدارة المسوّقين، القواعد، العمولات، وطلبات السحب." },
    ],
  }),
  component: AdminAffiliateHub,
});

const money = (n: number | string) =>
  new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(Number(n || 0)) + " ر.س";

function AdminAffiliateHub() {
  const [tab, setTab] = useState<"overview" | "affiliates" | "commissions" | "withdrawals" | "rules" | "marketing">("overview");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Handshake}
        title="التسويق بالعمولة"
        description="مركز إدارة المسوّقين، القواعد، العمولات، السحوبات، والمواد التسويقية."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1 h-auto p-1 bg-muted/40">
          <TabsTrigger value="overview" className="gap-2"><TrendingUp className="w-4 h-4"/>نظرة عامة</TabsTrigger>
          <TabsTrigger value="affiliates" className="gap-2"><Users className="w-4 h-4"/>المسوّقون</TabsTrigger>
          <TabsTrigger value="commissions" className="gap-2"><Percent className="w-4 h-4"/>العمولات</TabsTrigger>
          <TabsTrigger value="withdrawals" className="gap-2"><Banknote className="w-4 h-4"/>طلبات السحب</TabsTrigger>
          <TabsTrigger value="rules" className="gap-2"><Percent className="w-4 h-4"/>القواعد</TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2"><Megaphone className="w-4 h-4"/>المواد التسويقية</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><OverviewPane/></TabsContent>
        <TabsContent value="affiliates" className="mt-4"><AffiliatesPane/></TabsContent>
        <TabsContent value="commissions" className="mt-4"><CommissionsPane/></TabsContent>
        <TabsContent value="withdrawals" className="mt-4"><WithdrawalsPane/></TabsContent>
        <TabsContent value="rules" className="mt-4"><RulesPane/></TabsContent>
        <TabsContent value="marketing" className="mt-4"><MarketingPane/></TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────── OVERVIEW ───────────────────────────
function OverviewPane() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "affiliate", "overview"],
    queryFn: async () => (await api.get("/admin/affiliate/overview")).data,
    refetchInterval: 30_000,
  });
  const { data: top } = useQuery({
    queryKey: ["admin", "affiliate", "top"],
    queryFn: async () => (await api.get("/admin/affiliate/reports/top-affiliates")).data.rows,
  });
  const release = useMutation({
    mutationFn: async () => (await api.post("/admin/affiliate/release")).data,
    onSuccess: (r) => {
      toast.success(`تم تحرير ${r.released || 0} عمولة من أصل ${r.scanned || 0}`);
      qc.invalidateQueries({ queryKey: ["admin", "affiliate"] });
    },
    onError: () => toast.error("تعذّر تنفيذ التحرير"),
  });

  if (isLoading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28"/>)}</div>;

  const byStatus = new Map<string, { amount: number; count: number }>();
  for (const s of data?.commissions?.byStatus ?? []) byStatus.set(s.status, s);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="مسوّقون نشطون" value={data.affiliates.active} sub={`إجمالي ${data.affiliates.total}`}/>
        <KpiCard icon={Clock} label="طلبات قيد المراجعة" value={data.applications.pending}/>
        <KpiCard icon={Percent} label="إجمالي العمولات" value={money(data.commissions.total)} sub={`${data.commissions.count} قيد`}/>
        <KpiCard icon={Banknote} label="مدفوعات السحب" value={money(data.withdrawals.paidTotal)} sub={`${data.withdrawals.pending} قيد الانتظار`}/>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">توزيع العمولات حسب الحالة</h3>
              <Button size="sm" variant="outline" onClick={() => release.mutate()} disabled={release.isPending} className="gap-1">
                <RefreshCw className={cn("w-4 h-4", release.isPending && "animate-spin")}/>
                تحرير العمولات الناضجة
              </Button>
            </div>
            <div className="space-y-2">
              {["PENDING", "AVAILABLE", "WITHDRAWAL_REQUESTED", "PAID", "REVERSED", "REJECTED"].map((s) => {
                const row = byStatus.get(s) ?? { amount: 0, count: 0 };
                return (
                  <div key={s} className="flex items-center justify-between text-sm border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">{statusLabel(s)}</span>
                    <span className="font-medium tabular-nums">{money(row.amount)} <span className="text-xs text-muted-foreground">({row.count})</span></span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">أفضل المسوّقين</h3>
            <div className="space-y-1.5">
              {(top ?? []).map((r: any, i: number) => (
                <Link key={r.id} to="/admin/affiliate" className="flex items-center justify-between text-sm hover:bg-muted/50 rounded px-2 py-1.5 transition">
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs grid place-items-center font-bold">{i + 1}</span>
                    <span>{r.displayName || r.code}</span>
                    <span className="text-xs text-muted-foreground">{r.code}</span>
                  </span>
                  <span className="tabular-nums font-medium">{money(r.totalCommission)}</span>
                </Link>
              ))}
              {(!top || !top.length) && <p className="text-sm text-muted-foreground text-center py-6">لا توجد بيانات بعد</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><Icon className="w-4 h-4"/>{label}</div>
          <div className="text-xl md:text-2xl font-bold tabular-nums">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────── AFFILIATES ───────────────────────────
function AffiliatesPane() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "affiliate", "list", status, q],
    queryFn: async () => (await api.get("/admin/affiliate/affiliates", { params: { status: status === "all" ? undefined : status, q: q || undefined } })).data,
    refetchInterval: 15_000,
  });
  const approve = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/affiliate/affiliates/${id}/approve`)).data,
    onSuccess: () => { toast.success("تم الاعتماد وأُرسل إشعار واتساب"); qc.invalidateQueries({ queryKey: ["admin", "affiliate"] }); },
  });
  const suspend = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => (await api.post(`/admin/affiliate/affiliates/${id}/suspend`, { reason })).data,
    onSuccess: () => { toast.success("تم الإيقاف"); qc.invalidateQueries({ queryKey: ["admin", "affiliate"] }); },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="بحث بالاسم، الكود، الجوال، البريد…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs"/>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="PENDING">قيد المراجعة</SelectItem>
            <SelectItem value="ACTIVE">نشط</SelectItem>
            <SelectItem value="SUSPENDED">موقوف</SelectItem>
            <SelectItem value="REJECTED">مرفوض</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground mr-auto">الإجمالي: {data?.total ?? 0}</div>
      </div>

      {isLoading ? (
        <div className="grid gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20"/>)}</div>
      ) : (
        <div className="grid gap-2">
          {(data?.items ?? []).map((a: any) => (
            <Card key={a.id} className="hover:border-primary/40 transition">
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.displayName}</span>
                    <span className="text-xs text-muted-foreground">{a.code}</span>
                    <StatusChip status={a.status}/>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.email} • {a.phone} • {a.city || "—"}</div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <Stat label="روابط" value={a._count.links}/>
                  <Stat label="عملاء" value={a._count.referredCustomers}/>
                  <Stat label="عمولات" value={a._count.commissions}/>
                  <Stat label="سحوبات" value={a._count.withdrawals}/>
                </div>
                <div className="flex items-center gap-1">
                  {a.status === "PENDING" && (
                    <Button size="sm" onClick={() => approve.mutate(a.id)} className="gap-1"><CheckCircle2 className="w-4 h-4"/>اعتماد</Button>
                  )}
                  {a.status === "ACTIVE" && (
                    <Button size="sm" variant="outline" onClick={() => suspend.mutate({ id: a.id })} className="gap-1"><PauseCircle className="w-4 h-4"/>إيقاف</Button>
                  )}
                  {a.status === "SUSPENDED" && (
                    <Button size="sm" variant="outline" onClick={() => approve.mutate(a.id)} className="gap-1"><Play className="w-4 h-4"/>تفعيل</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSelected(a.id)}>تفاصيل</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data?.items?.length && <p className="text-center text-muted-foreground py-8">لا يوجد مسوّقون</p>}
        </div>
      )}

      {selected && <AffiliateDetailDialog id={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
}

function AffiliateDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "affiliate", "detail", id],
    queryFn: async () => (await api.get(`/admin/affiliate/affiliates/${id}`)).data,
  });
  const [rate, setRate] = useState<string>("");
  const [holdDays, setHoldDays] = useState<string>("");

  const save = useMutation({
    mutationFn: async () => (await api.patch(`/admin/affiliate/affiliates/${id}`, {
      ...(rate !== "" ? { customRate: Number(rate) } : {}),
      ...(holdDays !== "" ? { holdDays: Number(holdDays) } : {}),
    })).data,
    onSuccess: () => { toast.success("تم الحفظ"); qc.invalidateQueries({ queryKey: ["admin", "affiliate"] }); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>تفاصيل المسوّق</DialogTitle></DialogHeader>
        {isLoading ? <Skeleton className="h-64"/> : data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="معلّقة" value={money(data.balances.PENDING)}/>
              <Stat label="متاحة" value={money(data.balances.AVAILABLE)}/>
              <Stat label="محجوزة" value={money(data.balances.RESERVED)}/>
              <Stat label="مدفوعة" value={money(data.balances.PAID)}/>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>نسبة عمولة مخصّصة (%)</Label>
                <Input type="number" step="0.1" placeholder={String(data.affiliate.customRate ?? "افتراضي النظام")} value={rate} onChange={(e) => setRate(e.target.value)}/>
              </div>
              <div>
                <Label>أيام الحجز (Hold)</Label>
                <Input type="number" placeholder={String(data.affiliate.holdDays ?? "افتراضي النظام")} value={holdDays} onChange={(e) => setHoldDays(e.target.value)}/>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-sm">آخر العمولات</h4>
              <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                {data.recentCommissions.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-border/40 py-1">
                    <span>{statusLabel(c.status)}</span>
                    <span className="tabular-nums">{money(c.amount)}</span>
                    <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>حفظ التعديلات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────── COMMISSIONS ───────────────────────────
function CommissionsPane() {
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "affiliate", "commissions", status],
    queryFn: async () => (await api.get("/admin/affiliate/commissions", { params: { status: status === "all" ? undefined : status } })).data,
    refetchInterval: 15_000,
  });
  const qc = useQueryClient();
  const reverse = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/affiliate/commissions/${id}/reverse`, { reason: "عكس يدوي من الإدارة" })).data,
    onSuccess: () => { toast.success("تم عكس العمولة"); qc.invalidateQueries({ queryKey: ["admin", "affiliate"] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || "تعذّر"),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {["PENDING", "AVAILABLE", "WITHDRAWAL_REQUESTED", "PAID", "REVERSED", "REJECTED"].map((s) =>
              <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground mr-auto self-center">الإجمالي: {data?.total ?? 0}</div>
      </div>
      {isLoading ? <div className="grid gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14"/>)}</div> : (
        <div className="grid gap-2">
          {(data?.items ?? []).map((c: any) => (
            <Card key={c.id}><CardContent className="p-3 flex items-center gap-3 text-sm">
              <StatusChip status={c.status}/>
              <span className="flex-1">
                <span className="font-medium">{c.affiliate.displayName}</span>
                <span className="text-muted-foreground text-xs mx-2">{c.affiliate.code}</span>
                {c.orderRef && <span className="text-xs text-muted-foreground">• {c.orderRef}</span>}
              </span>
              <span className="tabular-nums font-medium">{money(c.amount)}</span>
              <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
              {c.status !== "REVERSED" && c.status !== "PAID" && (
                <Button size="sm" variant="ghost" onClick={() => reverse.mutate(c.id)}>عكس</Button>
              )}
            </CardContent></Card>
          ))}
          {!data?.items?.length && <p className="text-center text-muted-foreground py-6">لا توجد عمولات</p>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── WITHDRAWALS ───────────────────────────
function WithdrawalsPane() {
  const [status, setStatus] = useState("all");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "affiliate", "withdrawals", status],
    queryFn: async () => (await api.get("/admin/affiliate/withdrawals", { params: { status: status === "all" ? undefined : status } })).data,
    refetchInterval: 15_000,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...body }: any) => (await api.patch(`/admin/affiliate/withdrawals/${id}`, body)).data,
    onSuccess: () => { toast.success("تم التحديث"); qc.invalidateQueries({ queryKey: ["admin", "affiliate"] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || "تعذّر"),
  });

  const [payingId, setPayingId] = useState<string | null>(null);
  const [transferRef, setTransferRef] = useState("");

  return (
    <div className="space-y-3">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-48"><SelectValue/></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          {["NEW", "UNDER_REVIEW", "APPROVED", "PROCESSING", "PAID", "REJECTED", "CANCELLED"].map((s) =>
            <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
        </SelectContent>
      </Select>
      {isLoading ? <div className="grid gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24"/>)}</div> : (
        <div className="grid gap-2">
          {(data?.items ?? []).map((w: any) => (
            <Card key={w.id}><CardContent className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{w.requestNumber}</span>
                <StatusChip status={w.status}/>
                <span className="font-medium">{w.affiliate.displayName}</span>
                <span className="text-xs text-muted-foreground">{w.affiliate.code}</span>
                <span className="mr-auto tabular-nums font-semibold">{money(w.netAmount)}</span>
              </div>
              {w.account && (
                <div className="text-xs text-muted-foreground">{w.account.bankName} — {w.account.beneficiaryName} — {w.account.ibanMasked}</div>
              )}
              <div className="flex flex-wrap gap-1 pt-1">
                {w.status === "NEW" && <>
                  <Button size="sm" onClick={() => update.mutate({ id: w.id, status: "APPROVED" })} className="gap-1"><CheckCircle2 className="w-4 h-4"/>اعتماد</Button>
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ id: w.id, status: "REJECTED", rejectionReason: "غير مطابق للشروط" })} className="gap-1"><XCircle className="w-4 h-4"/>رفض</Button>
                </>}
                {(w.status === "APPROVED" || w.status === "PROCESSING") && (
                  <Button size="sm" onClick={() => { setPayingId(w.id); setTransferRef(""); }} className="gap-1"><Banknote className="w-4 h-4"/>تأكيد الدفع</Button>
                )}
              </div>
            </CardContent></Card>
          ))}
          {!data?.items?.length && <p className="text-center text-muted-foreground py-6">لا توجد طلبات سحب</p>}
        </div>
      )}

      <Dialog open={!!payingId} onOpenChange={() => setPayingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد تنفيذ التحويل</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>مرجع التحويل البنكي</Label>
            <Input value={transferRef} onChange={(e) => setTransferRef(e.target.value)} placeholder="رقم/مرجع التحويل"/>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayingId(null)}>إلغاء</Button>
            <Button onClick={() => {
              if (!payingId) return;
              update.mutate({ id: payingId, status: "PAID", transferRef });
              setPayingId(null);
            }}>تأكيد الدفع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────── RULES ───────────────────────────
function RulesPane() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "affiliate", "rules"],
    queryFn: async () => (await api.get("/admin/affiliate/rules")).data.items,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", scope: "GLOBAL", valueType: "PERCENTAGE", percentage: "5", fixedAmount: "",
    priority: "0", isActive: true, notes: "",
  });

  const create = useMutation({
    mutationFn: async () => (await api.post("/admin/affiliate/rules", {
      name: form.name,
      scope: form.scope,
      valueType: form.valueType,
      percentage: form.valueType === "PERCENTAGE" ? Number(form.percentage) : null,
      fixedAmount: form.valueType === "FIXED" ? Number(form.fixedAmount) : null,
      priority: Number(form.priority),
      isActive: form.isActive,
      notes: form.notes || null,
    })).data,
    onSuccess: () => { toast.success("تمت الإضافة"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin", "affiliate", "rules"] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || "تعذّر الحفظ"),
  });
  const toggle = useMutation({
    mutationFn: async (r: any) => (await api.patch(`/admin/affiliate/rules/${r.id}`, { isActive: !r.isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "affiliate", "rules"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/admin/affiliate/rules/${id}`)).data,
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin", "affiliate", "rules"] }); },
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}>+ إضافة قاعدة</Button></div>
      {isLoading ? <Skeleton className="h-40"/> : (
        <div className="grid gap-2">
          {(data ?? []).map((r: any) => (
            <Card key={r.id}><CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", r.isActive ? "bg-green-500" : "bg-muted")}/>
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-xs text-muted-foreground">أولوية {r.priority}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.scope} • {r.valueType === "PERCENTAGE" ? `${r.percentage}%` : `${r.fixedAmount} ر.س`}
                  {r.affiliate && ` • ${r.affiliate.displayName}`}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toggle.mutate(r)}>{r.isActive ? "تعطيل" : "تفعيل"}</Button>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)} className="text-red-600 hover:text-red-700">حذف</Button>
            </CardContent></Card>
          ))}
          {!data?.length && <p className="text-center text-muted-foreground py-6">لا توجد قواعد. النظام يستخدم الإعداد الافتراضي.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>قاعدة عمولة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>النطاق</Label>
                <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {["GLOBAL", "SERVICE_TYPE", "SERVICE", "AFFILIATE", "AFFILIATE_CAMPAIGN"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>النوع</Label>
                <Select value={form.valueType} onValueChange={(v) => setForm({ ...form, valueType: v })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">نسبة</SelectItem>
                    <SelectItem value="FIXED">مبلغ ثابت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.valueType === "PERCENTAGE" ? "النسبة %" : "المبلغ"}</Label>
                <Input type="number" step="0.1" value={form.valueType === "PERCENTAGE" ? form.percentage : form.fixedAmount}
                  onChange={(e) => setForm({ ...form, [form.valueType === "PERCENTAGE" ? "percentage" : "fixedAmount"]: e.target.value })}/>
              </div>
            </div>
            <div><Label>الأولوية</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}/></div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}/></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────── MARKETING ───────────────────────────
function MarketingPane() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "affiliate", "marketing"],
    queryFn: async () => (await api.get("/admin/affiliate/marketing")).data.items,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "WHATSAPP", category: "", content: "", isActive: true });

  const create = useMutation({
    mutationFn: async () => (await api.post("/admin/affiliate/marketing", { ...form, tags: [] })).data,
    onSuccess: () => { toast.success("تمت الإضافة"); setOpen(false); setForm({ title: "", type: "WHATSAPP", category: "", content: "", isActive: true }); qc.invalidateQueries({ queryKey: ["admin", "affiliate", "marketing"] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || "تعذّر"),
  });
  const toggle = useMutation({
    mutationFn: async (m: any) => (await api.patch(`/admin/affiliate/marketing/${m.id}`, { isActive: !m.isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "affiliate", "marketing"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/admin/affiliate/marketing/${id}`)).data,
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin", "affiliate", "marketing"] }); },
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}>+ مادة جديدة</Button></div>
      {isLoading ? <Skeleton className="h-40"/> : (
        <div className="grid gap-2">
          {(data ?? []).map((m: any) => (
            <Card key={m.id}><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("w-2 h-2 rounded-full", m.isActive ? "bg-green-500" : "bg-muted")}/>
                <span className="font-semibold">{m.title}</span>
                <span className="text-xs text-muted-foreground">{m.type}</span>
                <div className="mr-auto flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toggle.mutate(m)}>{m.isActive ? "إخفاء" : "نشر"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(m.id)} className="text-red-600">حذف</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{m.content}</p>
            </CardContent></Card>
          ))}
          {!data?.length && <p className="text-center text-muted-foreground py-6">لا توجد مواد تسويقية بعد</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>إضافة مادة تسويقية</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>العنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></div>
            <div>
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["TEXT", "WHATSAPP", "SOCIAL", "EMAIL", "LANDING_LINK", "PROFILE", "OFFER", "LOGO", "GUIDE"].map((t) =>
                    <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>الفئة</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="اختياري"/></div>
            <div>
              <Label>المحتوى</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6}
                placeholder="{{code}} للكود • {{link}} للرابط"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.content}>نشر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────── SHARED ───────────────────────────
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "bg-muted text-muted-foreground";
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", color)}>{statusLabel(status)}</span>;
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
  REJECTED: "bg-red-100 text-red-800",
  CLOSED: "bg-slate-100 text-slate-700",
  PAID: "bg-blue-100 text-blue-800",
  REVERSED: "bg-red-100 text-red-800",
  WITHDRAWAL_REQUESTED: "bg-violet-100 text-violet-800",
  NEW: "bg-sky-100 text-sky-800",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-slate-100 text-slate-700",
};
function statusLabel(s: string): string {
  return ({
    PENDING: "قيد المراجعة", ACTIVE: "نشط", AVAILABLE: "متاحة",
    SUSPENDED: "موقوف", REJECTED: "مرفوض", CLOSED: "مغلق",
    PAID: "مدفوعة", REVERSED: "معكوسة", WITHDRAWAL_REQUESTED: "قيد السحب",
    NEW: "جديد", UNDER_REVIEW: "قيد المراجعة", APPROVED: "معتمد",
    PROCESSING: "قيد التحويل", CANCELLED: "ملغى",
  } as Record<string, string>)[s] ?? s;
}
// Referenced for future deep-link expansions
void ExternalLink;
