import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, landingFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (s) => ({ redirect: (s.redirect as string | undefined) || undefined }),
  head: () => ({ meta: [{ title: "تسجيل الدخول | ASH HOLDING" }] }),
});

const schema = z.object({
  email: z.string().email("بريد غير صالح"),
  password: z.string().min(6, "كلمة السر قصيرة"),
});
type Form = z.infer<typeof schema>;

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user) navigate({ to: search.redirect || landingFor(user.role) });
  }, [user, navigate, search.redirect]);

  const onSubmit = async (data: Form) => {
    try {
      const u = await login(data.email, data.password);
      toast.success("أهلاً بك مجدداً");
      navigate({ to: search.redirect || landingFor(u.role) });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      {/* Left / Branding */}
      <div className="hidden lg:flex relative flex-col justify-between p-10 bg-gradient-to-br from-electric/10 via-transparent to-purple-accent/10 border-l border-border overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-10 right-10 h-80 w-80 rounded-full bg-electric/20 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-96 w-96 rounded-full bg-purple-accent/20 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand shadow-glow">
            <span className="text-sm font-bold text-primary-foreground">A</span>
          </div>
          <div>
            <div className="font-bold">ASH HOLDING</div>
            <div className="text-[11px] text-muted-foreground">شركة علي صالح الشهري القابضة</div>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="text-4xl xl:text-5xl font-black leading-tight">
            حلول رقمية <span className="gradient-text">بجودة مؤسسية</span>
          </div>
          <p className="mt-4 text-muted-foreground max-w-md">
            لوحة إدارة متكاملة لعملاء ASH HOLDING — تابع مشاريعك، فواتيرك، عقودك، ومدفوعاتك من مكان واحد.
          </p>
        </motion.div>
        <div className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} ASH HOLDING. جميع الحقوق محفوظة.</div>
      </div>

      {/* Right / Form */}
      <div className="flex items-center justify-center p-6 lg:p-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> العودة للموقع
          </Link>
          <h1 className="text-2xl font-black">مرحباً بعودتك</h1>
          <p className="mt-1 text-sm text-muted-foreground">سجّل دخولك للوصول إلى حسابك</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input dir="ltr" type="email" placeholder="you@company.com" className="pr-9 text-right" {...register("email")} />
              </div>
              {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>كلمة السر</Label>
                <Link to="/forgot-password" className="text-xs text-electric hover:underline">نسيت كلمة السر؟</Link>
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input dir="ltr" type="password" placeholder="••••••••" className="pr-9 text-right" {...register("password")} />
              </div>
              {errors.password && <p className="text-xs text-rose-400">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              {isSubmitting ? "جارٍ الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">أو</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Link
            to="/login-otp"
            search={{ redirect: search.redirect }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/15 transition"
          >
            <svg viewBox="0 0 32 32" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M16 3C9 3 3.5 8.5 3.5 15.5c0 2.3.6 4.5 1.8 6.4L3 29l7.4-2.2c1.8 1 3.9 1.5 6 1.5h.1C23.5 28.3 29 22.8 29 15.8 29 8.8 23.5 3 16 3zm0 22.6c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.4 1.3 1.3-4.3-.2-.4a10.4 10.4 0 0 1-1.6-5.6C5.3 9.7 10.1 4.9 16 4.9c5.9 0 10.7 4.8 10.7 10.8S21.9 25.6 16 25.6z"/></svg>
            الدخول عبر رمز الواتساب
          </Link>

          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-4 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground mb-1">حساب تجريبي:</div>
            <div>مدير: <span dir="ltr" className="font-mono">admin@ashholding.sa</span> / <span dir="ltr" className="font-mono">Admin@12345</span></div>
            <div>عميل: <span dir="ltr" className="font-mono">client@demo.sa</span> / <span dir="ltr" className="font-mono">Client@12345</span></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
