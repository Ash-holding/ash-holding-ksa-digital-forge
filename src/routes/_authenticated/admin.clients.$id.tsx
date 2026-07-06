import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate, fromNow } from "@/lib/format";
import { Money } from "@/components/ui/money";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import {
  Users, Building2, Mail, Phone, MapPin, ArrowRight, ShieldCheck, ShieldAlert,
  Globe, Wifi, Clock, Monitor, RefreshCw, Pencil, X, ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonRows, EmptyState } from "@/components/dashboard/EmptyState";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/clients/$id")({
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
  });
  const c = data?.client;

  const verify = useMutation({
    mutationFn: () => api.post(`/clients/${id}/verify`, {}),
    onSuccess: () => { toast.success("تم توثيق العميل"); qc.invalidateQueries({ queryKey: ["client", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const unverify = useMutation({
    mutationFn: (reject: boolean) => api.post(`/clients/${id}/unverify`, { reject }),
    onSuccess: () => { toast.success("تم تحديث حالة التوثيق"); qc.invalidateQueries({ queryKey: ["client", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const refreshGeo = useMutation({
    mutationFn: () => api.post(`/clients/${id}/refresh-geo`, {}),
    onSuccess: () => { toast.success("تم تحديث بيانات الموقع"); qc.invalidateQueries({ queryKey: ["client", id] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const disable = useMutation({
    mutationFn: () => api.delete(`/clients/${id}`),
    onSuccess: () => { toast.success("تم تعطيل الحساب"); nav({ to: "/admin/clients" }); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading) return <SkeletonRows rows={8} />;
  if (!c) return <EmptyState title="العميل غير موجود" />;

  const verified = c.verificationStatus === "VERIFIED";
  const flag = c.lastIpCountry?.length === 2
    ? String.fromCodePoint(...c.lastIpCountry.toUpperCase().split("").map((x: string) => 127397 + x.charCodeAt(0)))
    : "🌐";

  return (
    <>
      <PageHeader
        icon={Users}
        title={c.user.name}
        description={c.companyName || "بدون اسم شركة"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {verified ? (
              <ConfirmDialog
                title="إلغاء التوثيق"
                description="سيتم إعادة العميل إلى حالة غير موثّق."
                onConfirm={async () => { await unverify.mutateAsync(false); }}
                trigger={<Button size="sm" variant="outline" className="gap-1.5"><X className="h-3.5 w-3.5" /> إلغاء التوثيق</Button>}
              />
            ) : (
              <Button size="sm" onClick={() => verify.mutate()} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
                <ShieldCheck className="h-3.5 w-3.5" /> توثيق العميل
              </Button>
            )}
            <Button size="sm" variant="outline" asChild className="gap-1.5">
              <Link to="/admin/clients/$id/edit" params={{ id }}><Pencil className="h-3.5 w-3.5" /> تعديل</Link>
            </Button>
            <ConfirmDialog
              title="تعطيل حساب العميل"
              description="سيتم تعطيل الحساب ولن يستطيع تسجيل الدخول."
              onConfirm={async () => { await disable.mutateAsync(); }}
              trigger={<Button size="sm" variant="ghost" className="text-rose-400">تعطيل</Button>}
            />
            <Link to="/admin/clients" className="text-sm text-electric flex items-center gap-1">
              <ArrowRight className="h-4 w-4" /> العودة
            </Link>
          </div>
        }
      />

      {/* Identity strip: avatar, name, verified badge, quick facts */}
      <section className="rounded-2xl border border-border bg-gradient-to-l from-electric/5 via-card to-purple-accent/5 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className={cn(
            "grid h-16 w-16 place-items-center rounded-2xl text-2xl font-black shrink-0",
            verified ? "bg-emerald-500/10 text-emerald-400" : "bg-electric/10 text-electric",
          )}>
            {c.user.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black truncate">{c.user.name}</h2>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold">
                  <ShieldCheck className="h-3 w-3" /> موثّق
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-foreground/5 text-foreground/70 px-1.5 py-0.5 text-[10px] font-bold">
                  <ShieldAlert className="h-3 w-3" /> {c.verificationStatus === "PENDING" ? "قيد المراجعة" : c.verificationStatus === "REJECTED" ? "مرفوض" : "غير موثّق"}
                </span>
              )}
              <StatusBadge value={c.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground/70">
              {c.user.lastLoginAt && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> آخر دخول: {fromNow(c.user.lastLoginAt)}</span>}
              {typeof c.activeSessions === "number" && <span className="inline-flex items-center gap-1"><Monitor className="h-3 w-3" /> {c.activeSessions} جلسة نشطة</span>}
              {c.verifiedAt && verified && <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> وُثِّق {fromNow(c.verifiedAt)}{c.verifiedBy?.name ? ` بواسطة ${c.verifiedBy.name}` : ""}</span>}
            </div>
            {c.verificationNote && (
              <p className="mt-1.5 text-[11px] text-foreground/70 border-r-2 border-electric/40 pr-2">{c.verificationNote}</p>
            )}
          </div>
        </div>
      </section>

      {/* 3-column features: Contact + Identity/IP + Location */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card icon={Mail} title="الاتصال والشركة">
          <Row label="البريد" value={<span dir="ltr">{c.user.email}</span>} />
          <Row label="الجوال" value={<span dir="ltr">{c.phone || c.user.phone || "—"}</span>} />
          <Row label="الشركة" value={c.companyName || "—"} icon={Building2} />
          <Row label="السجل التجاري" value={<span dir="ltr">{c.commercialNumber || "—"}</span>} />
          <Row label="الرقم الضريبي" value={<span dir="ltr">{c.taxNumber || "—"}</span>} />
        </Card>

        <Card
          icon={Wifi}
          title="الهوية الرقمية و IP"
          action={
            <button onClick={() => refreshGeo.mutate()} className="text-[10px] text-electric hover:underline inline-flex items-center gap-1">
              <RefreshCw className={cn("h-3 w-3", refreshGeo.isPending && "animate-spin")} /> تحديث
            </button>
          }
        >
          <Row label="IP الأخير" value={<span dir="ltr" className="font-mono text-[12px]">{c.lastIpAddress || c.user.lastIpAddress || "—"}</span>} />
          <Row label="الدولة" value={<span className="inline-flex items-center gap-1.5">{flag} {c.lastIpCountry || c.country || "—"}</span>} icon={Globe} />
          <Row label="المدينة" value={c.lastIpCity || c.city || "—"} />
          <Row label="المنطقة" value={c.lastIpRegion || "—"} />
          <Row label="آخر ظهور" value={c.lastSeenAt ? fromNow(c.lastSeenAt) : "—"} icon={Clock} />
        </Card>

        <Card icon={MapPin} title="الموقع الجغرافي">
          {c.lat != null && c.lng != null ? (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-xl border border-border">
                <iframe
                  title="موقع العميل"
                  width="100%" height="180"
                  loading="lazy"
                  className="block"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(c.lng) - 0.05},${Number(c.lat) - 0.05},${Number(c.lng) + 0.05},${Number(c.lat) + 0.05}&layer=mapnik&marker=${c.lat},${c.lng}`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground/70 font-mono" dir="ltr">{Number(c.lat).toFixed(4)}, {Number(c.lng).toFixed(4)}</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=13/${c.lat}/${c.lng}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-electric hover:underline"
                >
                  فتح في الخرائط <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {c.address && <p className="text-[11px] text-foreground/70">{c.address}</p>}
            </div>
          ) : (
            <div className="text-[11px] text-foreground/60 text-center py-6">
              لا توجد إحداثيات بعد. سيتم جلبها تلقائياً عند تسجيل دخول العميل.
              <button onClick={() => refreshGeo.mutate()} className="block mx-auto mt-2 text-electric hover:underline">تحديث الآن</button>
            </div>
          )}
        </Card>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList dir="rtl" className="flex flex-wrap gap-1 h-auto justify-start bg-transparent p-0">
          {[
            ["projects", "المشاريع", c.projects?.length],
            ["services", "الخدمات", c.services?.length],
            ["invoices", "الفواتير", c.invoices?.length],
            ["contracts", "العقود", c.contracts?.length],
            ["tickets", "التذاكر", c.tickets?.length],
            ["payments", "المدفوعات", c.payments?.length],
            ["files", "الملفات", c.files?.length],
          ].map(([k, l, n]) => (
            <TabsTrigger key={k as string} value={k as string} className="data-[state=active]:bg-electric/10 data-[state=active]:text-electric">
              {l as string} {typeof n === "number" ? <span className="mr-1 text-xs text-foreground/60">({n})</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          {c.projects?.length ? c.projects.map((p: any) => (
            <ItemRow key={p.id} title={p.title || p.name} meta={`${formatDate(p.startDate)} → ${formatDate(p.dueDate)}`} badge={p.status} extra={`${p.progress}%`} />
          )) : <EmptyState title="لا توجد مشاريع" />}
        </TabsContent>
        <TabsContent value="services" className="mt-4">
          {c.services?.length ? c.services.map((s: any) => (
            <ItemRow key={s.id} title={s.name} meta={`تجديد: ${formatDate(s.renewalDate)}`} badge={s.status} extra={s.price ? <Money value={s.price} /> : ""} />
          )) : <EmptyState title="لا توجد خدمات" />}
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          {c.invoices?.length ? c.invoices.map((iv: any) => (
            <ItemRow key={iv.id} title={iv.invoiceNumber || iv.number} meta={`تاريخ الاستحقاق: ${formatDate(iv.dueAt || iv.dueDate)}`} badge={iv.status} extra={<Money value={iv.total || iv.amount} />} />
          )) : <EmptyState title="لا توجد فواتير" />}
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          {c.contracts?.length ? c.contracts.map((ct: any) => (
            <ItemRow key={ct.id} title={ct.title} meta={ct.contractNumber} badge={ct.status} extra={ct.value ? <Money value={ct.value} /> : ""} />
          )) : <EmptyState title="لا توجد عقود" />}
        </TabsContent>
        <TabsContent value="tickets" className="mt-4">
          {c.tickets?.length ? c.tickets.map((t: any) => (
            <ItemRow key={t.id} title={t.subject} meta={`${t.ticketNumber ?? ""} · ${formatDate(t.updatedAt, true)}`} badge={t.status} extra={<StatusBadge value={t.priority} />} />
          )) : <EmptyState title="لا توجد تذاكر" />}
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          {c.payments?.length ? c.payments.map((p: any) => (
            <ItemRow key={p.id} title={<Money value={p.amount} />} meta={`${p.method} · ${formatDate(p.paidAt || p.createdAt)}`} badge={p.status} />
          )) : <EmptyState title="لا توجد مدفوعات" />}
        </TabsContent>
        <TabsContent value="files" className="mt-4">
          {c.files?.length ? c.files.map((f: any) => (
            <a key={f.id} href={f.path} target="_blank" rel="noreferrer" className="block">
              <ItemRow title={f.originalName} meta={`${(f.size / 1024).toFixed(1)} KB · ${f.mimeType}`} extra={formatDate(f.createdAt)} />
            </a>
          )) : <EmptyState title="لا توجد ملفات" />}
        </TabsContent>
      </Tabs>
    </>
  );
}

function Card({ icon: Icon, title, action, children }: { icon: React.ComponentType<{ className?: string }>; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-electric" /> {title}
        </h3>
        {action}
      </header>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="text-foreground/60 inline-flex items-center gap-1">{Icon && <Icon className="h-3 w-3" />}{label}</span>
      <span className="font-semibold truncate max-w-[65%] text-left">{value}</span>
    </div>
  );
}

function ItemRow({ title, meta, badge, extra }: { title: ReactNode; meta?: string; badge?: string; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 mb-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        {meta && <div className="text-[11px] text-foreground/60 truncate">{meta}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge && <StatusBadge value={badge} />}
        {extra && <div className="text-sm font-bold">{extra}</div>}
      </div>
    </div>
  );
}
