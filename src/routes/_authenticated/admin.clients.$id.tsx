import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatSAR, formatDate } from "@/lib/format";
import { Users, Building2, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonRows, EmptyState } from "@/components/dashboard/EmptyState";

export const Route = createFileRoute("/_authenticated/admin/clients/$id")({
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
  });
  const c = data?.client;

  if (isLoading) return <SkeletonRows rows={8} />;
  if (!c) return <EmptyState title="العميل غير موجود" />;

  return (
    <>
      <PageHeader
        icon={Users}
        title={c.user.name}
        description={c.companyName || "بدون اسم شركة"}
        actions={
          <Link to="/admin/clients" className="text-sm text-electric flex items-center gap-1">
            <ArrowRight className="h-4 w-4" /> العودة للقائمة
          </Link>
        }
      />

      {/* Profile card */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={Mail} label="البريد" value={c.user.email} />
        <InfoCard icon={Phone} label="الجوال" value={c.phone || c.user.phone || "—"} />
        <InfoCard icon={Building2} label="الشركة" value={c.companyName || "—"} />
        <InfoCard icon={MapPin} label="المدينة" value={c.city || "—"} />
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
              {l as string} {typeof n === "number" ? <span className="mr-1 text-xs text-muted-foreground">({n})</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          {c.projects?.length ? c.projects.map((p: any) => (
            <RowLink key={p.id} to="/admin/projects" title={p.title} meta={`${formatDate(p.startDate)} → ${formatDate(p.dueDate)}`} badge={p.status} extra={`${p.progress}%`} />
          )) : <EmptyState title="لا توجد مشاريع" />}
        </TabsContent>
        <TabsContent value="services" className="mt-4">
          {c.services?.length ? c.services.map((s: any) => (
            <Row key={s.id} title={s.name} meta={`تجديد: ${formatDate(s.renewalDate)}`} badge={s.status} extra={s.price ? formatSAR(s.price) : ""} />
          )) : <EmptyState title="لا توجد خدمات" />}
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          {c.invoices?.length ? c.invoices.map((iv: any) => (
            <Row key={iv.id} title={iv.invoiceNumber} meta={`تاريخ الاستحقاق: ${formatDate(iv.dueAt)}`} badge={iv.status} extra={formatSAR(iv.total)} />
          )) : <EmptyState title="لا توجد فواتير" />}
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          {c.contracts?.length ? c.contracts.map((ct: any) => (
            <Row key={ct.id} title={ct.title} meta={ct.contractNumber} badge={ct.status} extra={ct.value ? formatSAR(ct.value) : ""} />
          )) : <EmptyState title="لا توجد عقود" />}
        </TabsContent>
        <TabsContent value="tickets" className="mt-4">
          {c.tickets?.length ? c.tickets.map((t: any) => (
            <Row key={t.id} title={t.subject} meta={`${t.ticketNumber} · ${formatDate(t.updatedAt, true)}`} badge={t.status} extra={<StatusBadge value={t.priority} />} />
          )) : <EmptyState title="لا توجد تذاكر" />}
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          {c.payments?.length ? c.payments.map((p: any) => (
            <Row key={p.id} title={formatSAR(p.amount)} meta={`${p.method} · ${formatDate(p.paidAt || p.createdAt)}`} badge={p.status} />
          )) : <EmptyState title="لا توجد مدفوعات" />}
        </TabsContent>
        <TabsContent value="files" className="mt-4">
          {c.files?.length ? c.files.map((f: any) => (
            <a key={f.id} href={f.path} target="_blank" rel="noreferrer" className="block">
              <Row title={f.originalName} meta={`${(f.size / 1024).toFixed(1)} KB · ${f.mimeType}`} extra={formatDate(f.createdAt)} />
            </a>
          )) : <EmptyState title="لا توجد ملفات" />}
        </TabsContent>
      </Tabs>
    </>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="mt-1 text-sm font-semibold truncate" dir="auto">{value}</div>
    </div>
  );
}

function Row({ title, meta, badge, extra }: { title: string; meta?: string; badge?: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 mb-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        {meta && <div className="text-[11px] text-muted-foreground truncate">{meta}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge && <StatusBadge value={badge} />}
        {extra && <div className="text-sm font-bold">{extra}</div>}
      </div>
    </div>
  );
}

function RowLink(props: React.ComponentProps<typeof Row> & { to: string }) {
  return <Row {...props} />;
}
