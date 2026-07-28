import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/affiliate/campaigns")({
  component: CampaignsPage,
});

type Campaign = {
  id: string; name: string; slug: string; description?: string | null;
  landingPath: string; isActive: boolean;
  _count: { links: number; clicks: number };
};

function CampaignsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", landingPath: "/", utmSource: "", utmMedium: "", utmCampaign: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-campaigns"],
    queryFn: async () => (await api.get("/affiliate/campaigns")).data as { items: Campaign[] },
  });

  const create = useMutation({
    mutationFn: async () => (await api.post("/affiliate/campaigns", form)).data,
    onSuccess: () => {
      toast.success("تم إنشاء الحملة");
      setShowForm(false);
      setForm({ name: "", slug: "", description: "", landingPath: "/", utmSource: "", utmMedium: "", utmCampaign: "" });
      qc.invalidateQueries({ queryKey: ["affiliate-campaigns"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "خطأ"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الحملات التسويقية</h1>
          <p className="text-sm text-muted-foreground">نظّم روابطك ضمن حملات لتحليل الأداء.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> حملة جديدة
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="rounded-2xl border border-border bg-card/40 p-4 grid gap-3 md:grid-cols-2">
          <input required placeholder="اسم الحملة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input required placeholder="slug (a-z, 0-9, -)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
          <input placeholder="مسار الهبوط" value={form.landingPath} onChange={(e) => setForm({ ...form, landingPath: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" />
          <input placeholder="UTM Source" value={form.utmSource} onChange={(e) => setForm({ ...form, utmSource: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input placeholder="UTM Medium" value={form.utmMedium} onChange={(e) => setForm({ ...form, utmMedium: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea placeholder="وصف مختصر" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" rows={2} />
          <button type="submit" disabled={create.isPending}
            className="md:col-span-2 rounded-lg bg-emerald-500 text-white px-4 py-2 text-sm font-semibold">
            {create.isPending ? "..." : "حفظ"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="font-semibold">لا توجد حملات بعد</div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.items.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card/40 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{c.slug}</div>
                </div>
                {!c.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">مُعطّل</span>}
              </div>
              {c.description && <p className="text-xs text-muted-foreground mb-3">{c.description}</p>}
              <div className="flex items-center gap-4 text-xs">
                <div><span className="font-bold text-lg tabular-nums">{c._count.links}</span> <span className="text-muted-foreground">رابط</span></div>
                <div><span className="font-bold text-lg tabular-nums">{c._count.clicks}</span> <span className="text-muted-foreground">نقرة</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
