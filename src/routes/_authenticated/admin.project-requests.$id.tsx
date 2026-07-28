import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowRight, Trash2, Save, Rocket, Eye, XCircle, Copy, ExternalLink,
  Wallet, Calendar, Phone, User as UserIcon, Mail, Tag, Sparkles, Clock,
  MessageSquare, Building2, Hash, FileText, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/project-requests/$id")({
  component: RequestDetailPage,
});

const CATEGORIES = [
  ["WEBSITE","موقع إلكتروني"],["MOBILE_APP","تطبيق جوال"],["ADMIN_SYSTEM","نظام إداري"],
  ["HOSTING","استضافة"],["VPS","خادم VPS"],["DEDICATED_SERVER","خادم مخصص"],
  ["SMTP","خدمة SMTP"],["MARKETING","تسويق رقمي"],["DESIGN","تصميم وهوية"],
  ["SUPPORT","دعم وصيانة"],["OTHER","طلب مخصص"],
] as const;
const PRIORITIES = [["LOW","منخفضة"],["NORMAL","عادية"],["HIGH","عالية"],["URGENT","عاجلة"]] as const;
const STATUSES = [
  ["PENDING","قيد الانتظار"],["UNDER_REVIEW","قيد الدراسة"],
  ["PROPOSAL_SENT","عرض مُرسَل"],["CLIENT_REVISION","طلب تعديل"],
  ["AWAITING_SIGNATURE","بانتظار التوقيع"],["SIGNED","موقّع"],
  ["IN_PROGRESS","قيد التنفيذ"],["DELIVERED","تم التسليم"],
  ["APPROVED","مقبول"],["REJECTED","مرفوض"],
  ["CONVERTED","محوّل لمشروع"],["COMPLETED","مكتمل"],
] as const;

type Form = {
  title: string; description: string; category: string; priority: string; status: string;
  budgetMin: string; budgetMax: string; targetDate: string;
  contactName: string; contactPhone: string; adminNote: string;
};

function RequestDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["project-request", id],
    queryFn: async () => (await api.get(`/projects/requests/${id}`)).data,
    refetchInterval: 10000,
  });
  const r = q.data?.request;
  const ref = q.data?.ref as string | undefined;

  const [form, setForm] = useState<Form | null>(null);
  const [projectBudget, setProjectBudget] = useState("");

  useEffect(() => {
    if (!r) return;
    setForm({
      title: r.title ?? "",
      description: r.description ?? "",
      category: r.category ?? "OTHER",
      priority: r.priority ?? "NORMAL",
      status: r.status ?? "PENDING",
      budgetMin: r.budgetMin != null ? String(r.budgetMin) : "",
      budgetMax: r.budgetMax != null ? String(r.budgetMax) : "",
      targetDate: r.targetDate ? String(r.targetDate).slice(0, 10) : "",
      contactName: r.contactName ?? "",
      contactPhone: r.contactPhone ?? "",
      adminNote: r.adminNote ?? "",
    });
  }, [r?.id, r?.updatedAt]);

  const original = useMemo(() => {
    if (!r) return null;
    return {
      title: r.title ?? "", description: r.description ?? "",
      category: r.category ?? "OTHER", priority: r.priority ?? "NORMAL",
      status: r.status ?? "PENDING",
      budgetMin: r.budgetMin != null ? String(r.budgetMin) : "",
      budgetMax: r.budgetMax != null ? String(r.budgetMax) : "",
      targetDate: r.targetDate ? String(r.targetDate).slice(0, 10) : "",
      contactName: r.contactName ?? "", contactPhone: r.contactPhone ?? "",
      adminNote: r.adminNote ?? "",
    } as Form;
  }, [r]);
  const dirty = !!(form && original && JSON.stringify(form) !== JSON.stringify(original));

  const patch = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/projects/requests/${id}`, data),
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["project-request", id] });
      qc.invalidateQueries({ queryKey: ["project-requests"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const del = useMutation({
    mutationFn: () => api.delete(`/projects/requests/${id}`),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["project-requests"] });
      nav({ to: "/admin/project-requests" });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const saveAll = () => {
    if (!form) return;
    patch.mutate({
      title: form.title,
      description: form.description || null,
      category: form.category,
      priority: form.priority,
      status: form.status,
      budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
      targetDate: form.targetDate || null,
      contactName: form.contactName || null,
      contactPhone: form.contactPhone || null,
      adminNote: form.adminNote || null,
    });
  };

  const quickStatus = (status: string) =>
    patch.mutate({ status, adminNote: form?.adminNote || undefined });

  const convert = () =>
    patch.mutate({
      status: "APPROVED",
      convertToProject: true,
      adminNote: form?.adminNote || undefined,
      projectBudget: projectBudget ? Number(projectBudget) : undefined,
    });

  const copyRef = async () => {
    if (!ref) return;
    await navigator.clipboard.writeText(ref);
    toast.success("تم نسخ الرقم المرجعي");
  };

  if (q.isLoading || !form) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-40 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-40 rounded-2xl bg-muted/30 animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-96 lg:col-span-2 rounded-2xl bg-muted/30 animate-pulse" />
          <div className="h-96 rounded-2xl bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }
  if (q.isError || !r) {
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
        <div className="font-bold text-rose-200 mb-1">تعذّر تحميل الطلب</div>
        <div className="text-xs text-rose-300/70 mb-3">{apiError(q.error)}</div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/project-requests">عودة للطلبات</Link>
        </Button>
      </div>
    );
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const priorityColor =
    form.priority === "URGENT" ? "from-rose-500/30 to-rose-500/5"
    : form.priority === "HIGH" ? "from-amber-500/30 to-amber-500/5"
    : form.priority === "LOW" ? "from-slate-500/20 to-slate-500/5"
    : "from-electric/25 to-purple-accent/10";

  return (
    <div className="space-y-4" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/admin/project-requests"><ArrowRight className="h-4 w-4" /> عودة لطلبات المشاريع</Link>
        </Button>
        <div className="flex items-center gap-2">
          <ConfirmDialog
            title="حذف الطلب" description="سيتم حذف الطلب نهائياً."
            onConfirm={async () => { await del.mutateAsync(); }}
            trigger={<Button variant="ghost" size="sm" className="text-rose-400 gap-1.5"><Trash2 className="h-3.5 w-3.5" /> حذف</Button>}
          />
          <Button size="sm" onClick={saveAll} disabled={!dirty || patch.isPending}
            className="gap-1.5 bg-gradient-to-r from-electric to-purple-accent">
            <Save className="h-3.5 w-3.5" /> {patch.isPending ? "جارٍ الحفظ…" : dirty ? "حفظ التعديلات" : "لا تغييرات"}
          </Button>
        </div>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className={cn("relative overflow-hidden rounded-3xl border border-border bg-card p-5 md:p-6")}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-bl opacity-60 pointer-events-none", priorityColor)} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <button onClick={copyRef} className="inline-flex items-center gap-1 rounded-full bg-background/70 backdrop-blur px-2.5 py-1 text-[11px] font-bold ring-1 ring-border hover:ring-electric/40">
                <Hash className="h-3 w-3" /> {ref} <Copy className="h-3 w-3 opacity-60" />
              </button>
              <StatusBadge value={form.status} />
              <StatusBadge value={form.priority} />
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-semibold">
                <Tag className="h-3 w-3" />
                {CATEGORIES.find(([k]) => k === form.category)?.[1] ?? form.category}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1 truncate">{form.title || "طلب بدون عنوان"}</h1>
            <div className="text-[12px] text-muted-foreground flex items-center gap-2 flex-wrap">
              <UserIcon className="h-3.5 w-3.5" /> {r.client?.user?.name ?? "—"}
              <span className="opacity-40">·</span>
              <Mail className="h-3.5 w-3.5" /> {r.client?.user?.email ?? "—"}
              <span className="opacity-40">·</span>
              <Clock className="h-3.5 w-3.5" /> أُنشئ {formatDate(r.createdAt)}
            </div>
          </div>
          {r.project?.id ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/admin/projects/$id" params={{ id: r.project.id }}>
                فتح المشروع <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => quickStatus("UNDER_REVIEW")}>
          <Eye className="h-3.5 w-3.5" /> قيد الدراسة
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 border-emerald-400/40 text-emerald-400"
          onClick={() => quickStatus("APPROVED")}>
          <CheckCircle2 className="h-3.5 w-3.5" /> قبول
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 border-rose-400/40 text-rose-400"
          onClick={() => quickStatus("REJECTED")}>
          <XCircle className="h-3.5 w-3.5" /> رفض
        </Button>
        {!r.project?.id && (
          <Button size="sm" className="gap-1.5 bg-gradient-to-r from-electric to-purple-accent ms-auto" onClick={convert}>
            <Rocket className="h-3.5 w-3.5" /> تحويل لمشروع رسمي
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main editable content */}
        <div className="lg:col-span-2 space-y-4">
          <Section title="المعلومات الأساسية" icon={FileText}>
            <div className="grid gap-3">
              <Field label="عنوان الطلب">
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="الوصف الكامل">
                <Textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)}
                  placeholder="تفاصيل المشروع، النطاق، المتطلبات…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="التصنيف">
                  <Select value={form.category} onChange={(v) => set("category", v)} options={CATEGORIES} />
                </Field>
                <Field label="الأولوية">
                  <Select value={form.priority} onChange={(v) => set("priority", v)} options={PRIORITIES} />
                </Field>
                <Field label="الحالة">
                  <Select value={form.status} onChange={(v) => set("status", v)} options={STATUSES} />
                </Field>
                <Field label="التاريخ المستهدف">
                  <Input type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
                </Field>
                <Field label="الميزانية من (ر.س)">
                  <Input type="number" step="100" value={form.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} />
                </Field>
                <Field label="الميزانية إلى (ر.س)">
                  <Input type="number" step="100" value={form.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="ملاحظات الإدارة (تُرسَل للعميل عند الحفظ)" icon={MessageSquare}>
            <Textarea rows={4} value={form.adminNote} onChange={(e) => set("adminNote", e.target.value)}
              placeholder="اذكر تقديراً زمنياً/مالياً، طلبات توضيح، أو أي رد رسمي للعميل…" />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              سيصل هذا الرد للعميل عبر واتساب عند تغيير الحالة أو الحفظ.
            </p>
          </Section>

          {!r.project?.id && (
            <Section title="التحويل لمشروع رسمي" icon={Rocket}>
              <Field label="ميزانية المشروع النهائية (اختياري)">
                <Input type="number" step="100" value={projectBudget} onChange={(e) => setProjectBudget(e.target.value)}
                  placeholder={form.budgetMax || "المبلغ النهائي"} />
              </Field>
              <Button className="mt-3 w-full gap-1.5 bg-gradient-to-r from-electric to-purple-accent" onClick={convert}>
                <Rocket className="h-4 w-4" /> إنشاء المشروع وإشعار العميل
              </Button>
            </Section>
          )}
        </div>

        {/* Side: client + contact */}
        <div className="space-y-4">
          <Section title="بيانات العميل" icon={Building2}>
            <InfoLine icon={UserIcon} label="الاسم" value={r.client?.user?.name} />
            <InfoLine icon={Mail} label="البريد" value={r.client?.user?.email} />
            <InfoLine icon={Phone} label="جوال الحساب" value={r.client?.user?.phone} />
            <Button asChild variant="outline" size="sm" className="w-full mt-2 gap-1.5">
              <Link to="/admin/clients/$id" params={{ id: r.client?.id ?? "" }}>
                فتح ملف العميل <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </Section>

          <Section title="تواصل الطلب" icon={Phone}>
            <Field label="اسم المسؤول">
              <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
            </Field>
            <Field label="جوال التواصل">
              <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} dir="ltr" />
            </Field>
          </Section>

          <Section title="الجدول الزمني" icon={Sparkles}>
            <InfoLine icon={Clock} label="أُنشئ" value={formatDate(r.createdAt)} />
            <InfoLine icon={Clock} label="آخر تحديث" value={formatDate(r.updatedAt)} />
            <InfoLine icon={Calendar} label="مستهدف" value={form.targetDate ? formatDate(form.targetDate) : "—"} />
            <InfoLine icon={Wallet} label="الميزانية"
              value={(form.budgetMin || form.budgetMax)
                ? `${form.budgetMin || "—"} – ${form.budgetMax || "—"} ر.س`
                : "—"} />
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ---------- small internal UI ---------- */

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4 md:p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-electric/20 to-purple-accent/20 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-electric" />
        </div>
        <h3 className="text-[13px] font-bold">{title}</h3>
      </div>
      {children}
    </motion.section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: readonly (readonly [string, string])[];
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric/40"
    >
      {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-[12px] border-b border-border/40 last:border-0">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-semibold truncate max-w-[60%] text-left" dir="ltr">{value || "—"}</span>
    </div>
  );
}
