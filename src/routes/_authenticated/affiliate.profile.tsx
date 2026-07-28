import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/affiliate/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["affiliate-me"],
    queryFn: async () => (await api.get("/affiliate/me")).data as { affiliate: any },
  });

  const [form, setForm] = useState({ displayName: "", bio: "", website: "", city: "", preferredPayout: "BANK_SA" });

  useEffect(() => {
    if (data?.affiliate) {
      setForm({
        displayName: data.affiliate.displayName || "",
        bio: data.affiliate.bio || "",
        website: data.affiliate.website || "",
        city: data.affiliate.city || "",
        preferredPayout: data.affiliate.preferredPayout || "BANK_SA",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => (await api.patch("/affiliate/me", form)).data,
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["affiliate-me"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "خطأ"),
  });

  if (!data?.affiliate) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">الملف الشخصي</h1>
        <p className="text-sm text-muted-foreground">
          كود الإحالة: <span className="font-mono font-bold text-foreground">{data.affiliate.code}</span>
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="rounded-2xl border border-border bg-card/40 p-5 space-y-4">
        <Field label="الاسم الظاهر">
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="المدينة">
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="الموقع الإلكتروني">
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="نبذة تعريفية">
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="طريقة السحب المفضّلة">
          <select value={form.preferredPayout} onChange={(e) => setForm({ ...form, preferredPayout: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="BANK_SA">تحويل بنكي (السعودية)</option>
            <option value="IBAN">آيبان دولي</option>
            <option value="DIGITAL_WALLET">محفظة رقمية</option>
            <option value="ACCOUNT_CREDIT">رصيد بالحساب</option>
          </select>
        </Field>
        <button type="submit" disabled={save.isPending}
          className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white flex items-center gap-2">
          <Save className="h-4 w-4" /> {save.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
