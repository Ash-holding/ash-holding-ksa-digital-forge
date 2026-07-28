import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Wallet, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/affiliate/apply")({
  component: ApplyPage,
});

function ApplyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    city: "",
    type: "INDIVIDUAL" as "INDIVIDUAL" | "COMPANY",
    idNumber: "",
    commercialNo: "",
    preferredPayout: "BANK_SA" as any,
    notes: "",
    agreementAccepted: false,
  });

  const submit = useMutation({
    mutationFn: async () => (await api.post("/affiliate/apply", { ...form, agreementVersion: "v1" })).data,
    onSuccess: () => {
      toast.success("تم إرسال طلبك بنجاح، سنراجعه ونعود إليك.");
      navigate({ to: "/affiliate" });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || "تعذّر إرسال الطلب"),
  });

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-background via-background to-amber-950/10 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center shadow-glow">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">انضم لبرنامج شركاء ASH</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            كن جزءاً من شبكة شركائنا واحصل على عمولة تنافسية على كل عميل ناجح تحوّله لخدماتنا.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, label: "عمولة تصل %20", color: "text-emerald-500" },
            { icon: Wallet, label: "سحب فوري", color: "text-amber-500" },
            { icon: ShieldCheck, label: "تتبّع شفاف", color: "text-blue-500" },
          ].map((b) => (
            <div key={b.label} className="rounded-xl border border-border bg-card/40 p-3 text-center">
              <b.icon className={`h-5 w-5 mx-auto ${b.color}`} />
              <div className="text-xs mt-1 font-semibold">{b.label}</div>
            </div>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (!form.agreementAccepted) { toast.error("يجب الموافقة على الشروط"); return; } submit.mutate(); }}
          className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="الاسم الكامل"><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inp} /></F>
            <F label="رقم الجوال"><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} dir="ltr" /></F>
            <F label="البريد الإلكتروني"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} dir="ltr" /></F>
            <F label="المدينة"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inp} /></F>
            <F label="نوع الحساب">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className={inp}>
                <option value="INDIVIDUAL">فرد</option>
                <option value="COMPANY">شركة</option>
              </select>
            </F>
            <F label="طريقة السحب المفضّلة">
              <select value={form.preferredPayout} onChange={(e) => setForm({ ...form, preferredPayout: e.target.value })} className={inp}>
                <option value="BANK_SA">تحويل بنكي (السعودية)</option>
                <option value="IBAN">آيبان دولي</option>
                <option value="DIGITAL_WALLET">محفظة رقمية</option>
              </select>
            </F>
            {form.type === "INDIVIDUAL" && (
              <F label="رقم الهوية (اختياري)"><input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} className={inp} dir="ltr" /></F>
            )}
            {form.type === "COMPANY" && (
              <F label="السجل التجاري"><input value={form.commercialNo} onChange={(e) => setForm({ ...form, commercialNo: e.target.value })} className={inp} dir="ltr" /></F>
            )}
          </div>
          <F label="ملاحظات (اختياري)">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inp} />
          </F>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.agreementAccepted} onChange={(e) => setForm({ ...form, agreementAccepted: e.target.checked })}
              className="mt-1" />
            <span className="text-muted-foreground">أوافق على <a href="/terms" target="_blank" className="text-amber-500 underline">شروط الشراكة</a> وسياسة العمولات والاستخدام العادل.</span>
          </label>

          <button type="submit" disabled={submit.isPending}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">
            {submit.isPending ? "جارٍ الإرسال..." : "إرسال طلب الانضمام"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
