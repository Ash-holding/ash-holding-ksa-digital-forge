import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Plus, Trash2, Power, Link2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/affiliate/links")({
  component: LinksPage,
});

type Link = {
  id: string; slug: string; landingPath: string; label?: string | null;
  isActive: boolean; totalClicks: number; totalConversions: number;
  campaign?: { id: string; name: string } | null;
};

function LinksPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [landingPath, setLandingPath] = useState("/");
  const [label, setLabel] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-links"],
    queryFn: async () => (await api.get("/affiliate/links")).data as { items: Link[]; code: string },
  });

  const create = useMutation({
    mutationFn: async (payload: { landingPath: string; label?: string }) =>
      (await api.post("/affiliate/links", payload)).data,
    onSuccess: () => {
      toast.success("تم إنشاء الرابط");
      setShowForm(false); setLandingPath("/"); setLabel("");
      qc.invalidateQueries({ queryKey: ["affiliate-links"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "تعذّر الإنشاء"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.patch(`/affiliate/links/${id}`, { isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["affiliate-links"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/affiliate/links/${id}`)).data,
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["affiliate-links"] });
    },
  });

  const base = window.location.origin;
  const short = (slug: string) => `${base}/r/${slug}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">روابط الإحالة</h1>
          <p className="text-sm text-muted-foreground">أنشئ روابط مختصرة قابلة للمشاركة وتتبّع أدائها.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> رابط جديد
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          onSubmit={(e) => { e.preventDefault(); create.mutate({ landingPath, label: label || undefined }); }}
          className="rounded-2xl border border-border bg-card/40 p-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label className="text-xs text-muted-foreground">صفحة الهبوط</label>
            <input value={landingPath} onChange={(e) => setLandingPath(e.target.value)}
              placeholder="/ أو /services/branding"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">اسم توضيحي (اختياري)</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="حملة انستقرام"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={create.isPending}
            className="self-end rounded-lg bg-emerald-500 text-white px-4 py-2 text-sm font-semibold">
            {create.isPending ? "..." : "إنشاء"}
          </button>
        </motion.form>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Link2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="font-semibold">لا توجد روابط بعد</div>
          <div className="text-sm text-muted-foreground mt-1">أنشئ أول رابط لبدء التتبّع</div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((l) => (
            <motion.div key={l.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-xl border border-border bg-card/40 p-4 flex flex-col md:flex-row md:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-sm truncate">{l.label || l.landingPath}</div>
                  {!l.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">مُعطّل</span>}
                  {l.campaign && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{l.campaign.name}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono truncate">
                  {short(l.slug)}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold tabular-nums">{l.totalClicks}</div>
                  <div className="text-[10px] text-muted-foreground">نقرات</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold tabular-nums text-emerald-500">{l.totalConversions}</div>
                  <div className="text-[10px] text-muted-foreground">تحويلات</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { navigator.clipboard.writeText(short(l.slug)); toast.success("تم النسخ"); }}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted"><Copy className="h-4 w-4" /></button>
                <button onClick={() => toggle.mutate({ id: l.id, isActive: !l.isActive })}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-muted"><Power className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm("حذف الرابط؟")) del.mutate(l.id); }}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-rose-500 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
