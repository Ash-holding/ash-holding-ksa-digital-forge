import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, MailCheck } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { useState } from "react";

export const Route = createFileRoute("/forgot-password")({
  component: Page,
  head: () => ({ meta: [{ title: "استعادة كلمة السر | ASH HOLDING" }] }),
});

const schema = z.object({ email: z.string().email("بريد غير صالح") });

function Page() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<{ email: string }>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: { email: string }) => {
    try {
      await api.post("/auth/forgot-password", data);
      setSent(true);
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div dir="rtl" className="min-h-screen grid place-items-center bg-background px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> العودة لتسجيل الدخول
        </Link>
        {sent ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-4">
              <MailCheck className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold">تحقق من بريدك</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              إذا كان البريد مسجلاً لدينا، سيصلك رابط إعادة تعيين كلمة السر خلال دقائق.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black">استعادة كلمة السر</h1>
            <p className="mt-1 text-sm text-muted-foreground">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة التعيين.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input dir="ltr" type="email" placeholder="you@company.com" className="pr-9 text-right" {...register("email")} />
                </div>
                {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
