import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/financing/disclosures")({
  component: AdminDisclosures,
  head: () => ({ meta: [{ title: "إدارة الإفصاحات — ASH Admin" }] }),
});

type Category = "RATE_SHEET" | "TERMS" | "COMPLAINTS" | "GOVERNANCE" | "SAMA_NOTICE" | "REPORT";
type Disclosure = {
  id: string; slug: string; titleAr: string; category: Category;
  summaryAr?: string | null; bodyAr: string; documentPath?: string | null;
  effectiveAt?: string | null; publishedAt?: string | null;
  isPublished: boolean; order: number;
};

const CATEGORIES: Array<{ v: Category; label: string }> = [
  { v: "RATE_SHEET", label: "قوائم الأسعار والرسوم" },
  { v: "TERMS", label: "الشروط والأحكام" },
  { v: "COMPLAINTS", label: "سياسة الشكاوى" },
  { v: "GOVERNANCE", label: "الحوكمة" },
  { v: "SAMA_NOTICE", label: "إشعارات ساما" },
  { v: "REPORT", label: "التقارير الدورية" },
];

type Form = {
  slug: string; titleAr: string; category: Category; summaryAr: string; bodyAr: string;
  documentPath: string; effectiveAt: string; isPublished: boolean; order: number;
};

const EMPTY_FORM: Form = {
  slug: "", titleAr: "", category: "TERMS", summaryAr: "", bodyAr: "",
  documentPath: "", effectiveAt: "", isPublished: false, order: 0,
};

function AdminDisclosures() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Disclosure | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const list = useQuery({
    queryKey: ["admin-disclosures"],
    queryFn: () => api.get<{ disclosures: Disclosure[] }>(`/financing/admin/disclosures`).then((r) => r.data.disclosures),
  });

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (d: Disclosure) => {
    setEditing(d);
    setForm({
      slug: d.slug, titleAr: d.titleAr, category: d.category,
      summaryAr: d.summaryAr ?? "", bodyAr: d.bodyAr,
      documentPath: d.documentPath ?? "",
      effectiveAt: d.effectiveAt ? d.effectiveAt.slice(0, 10) : "",
      isPublished: d.isPublished, order: d.order,
    });
    setShowForm(true);
  };

  const buildPayload = () => ({
    slug: form.slug.trim(),
    titleAr: form.titleAr.trim(),
    category: form.category,
    summaryAr: form.summaryAr.trim() || null,
    bodyAr: form.bodyAr.trim(),
    documentPath: form.documentPath.trim() || null,
    effectiveAt: form.effectiveAt ? new Date(form.effectiveAt).toISOString() : null,
    isPublished: form.isPublished,
    order: Number(form.order) || 0,
  });

  const save = useMutation({
    mutationFn: () => editing
      ? api.patch(`/financing/admin/disclosures/${editing.id}`, buildPayload())
      : api.post(`/financing/admin/disclosures`, buildPayload()),
    onSuccess: () => {
      toast.success("تم الحفظ");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["admin-disclosures"] });
    },
    onError: (e) => toast.error(apiError(e) || "تعذر الحفظ"),
  });

  const togglePublish = useMutation({
    mutationFn: (d: Disclosure) => api.patch(`/financing/admin/disclosures/${d.id}`, { isPublished: !d.isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-disclosures"] }),
    onError: (e) => toast.error(apiError(e) || "تعذر التحديث"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/financing/admin/disclosures/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-disclosures"] }); },
    onError: (e) => toast.error(apiError(e) || "تعذر الحذف"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة الإفصاحات"
        description="نشر وتحديث الإفصاحات الرسمية وسياسات الحوكمة"
        icon={FileText}
        actions={<Button size="sm" onClick={openNew} className="gap-1"><Plus className="h-4 w-4" /> إفصاح جديد</Button>}
      />

      {showForm && (
        <section className="rounded-2xl border border-electric/25 bg-white/5 p-5 space-y-3">
          <div className="text-sm font-bold">{editing ? "تعديل إفصاح" : "إفصاح جديد"}</div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="المعرّف (slug — أحرف صغيرة وشرطات)">
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="rate-sheet-2026" dir="ltr" />
            </Field>
            <Field label="الفئة">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="العنوان">
              <Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
            </Field>
            <Field label="ترتيب العرض (رقم)">
              <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
            </Field>
            <Field label="ملخص قصير (اختياري)">
              <Input value={form.summaryAr} onChange={(e) => setForm({ ...form, summaryAr: e.target.value })} />
            </Field>
            <Field label="تاريخ السريان (اختياري)">
              <Input type="date" value={form.effectiveAt} onChange={(e) => setForm({ ...form, effectiveAt: e.target.value })} />
            </Field>
            <Field label="رابط المستند (اختياري)">
              <Input value={form.documentPath} onChange={(e) => setForm({ ...form, documentPath: e.target.value })} dir="ltr" placeholder="https://…" />
            </Field>
            <div className="flex items-center gap-3 self-end pb-2">
              <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
              <span className="text-sm">منشور علنياً</span>
            </div>
          </div>
          <Field label="المحتوى">
            <Textarea rows={6} value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !form.slug || !form.titleAr || !form.bodyAr}>
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5">
        <div className="p-4 text-xs text-muted-foreground border-b border-white/5">
          {list.data ? `${list.data.length} إفصاح` : "…"}
        </div>
        <ul className="divide-y divide-white/5">
          {list.data?.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{d.titleAr}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {CATEGORIES.find((c) => c.v === d.category)?.label} • <span dir="ltr">{d.slug}</span>
                  {d.publishedAt && ` • نُشر ${new Date(d.publishedAt).toLocaleDateString("ar-SA")}`}
                </div>
              </div>
              <span className={`text-[11px] px-2 py-1 rounded-full ${d.isPublished ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"}`}>
                {d.isPublished ? "منشور" : "مسودة"}
              </span>
              <Button size="sm" variant="ghost" onClick={() => togglePublish.mutate(d)} disabled={togglePublish.isPending}>
                {d.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { if (confirm("حذف الإفصاح؟")) remove.mutate(d.id); }}>
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </li>
          ))}
          {list.data?.length === 0 && (
            <li className="p-10 text-center text-sm text-muted-foreground">لا توجد إفصاحات بعد.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      {children}
    </label>
  );
}
