import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, ShieldCheck } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import { useAuth, landingFor } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login-otp")({
  component: LoginOtpPage,
  head: () => ({
    meta: [
      { title: "الدخول عبر الواتساب | ASH HOLDING" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابك عبر رمز تحقق يصلك على الواتساب." },
    ],
  }),
});

type Step = "phone" | "code";

function LoginOtpPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  type LogEntry = { at: number; kind: "request" | "verify"; ok: boolean; reason: string };
  const [log, setLog] = useState<LogEntry[]>([]);
  const pushLog = (e: Omit<LogEntry, "at">) =>
    setLog((prev) => [{ at: Date.now(), ...e }, ...prev].slice(0, 5));
  const maskedPhone = phone ? phone.replace(/.(?=.{3})/g, "•") : "—";
  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const expired = step === "code" && expiresAt !== null && remaining <= 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const requestOtp = async () => {
    if (loading) return;
    if (!phone || phone.length < 8) {
      toast.error("أدخل رقم هاتف صحيح");
      return;
    }
    setLoading(true);
    try {
      let ttlSec = 600;
      try {
        const { data } = await api.post("/whatsapp/otp/request", { phone, purpose });
        ttlSec = Number(data?.expiresInSec) || 600;
        toast.success("تم إرسال رمز التحقق على واتساب");
      } catch {
        // Demo fallback: backend not deployed → simulate OTP delivery
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ash_demo_otp", "123456");
          sessionStorage.setItem("ash_demo_otp_phone", phone);
        }
        toast.info("وضع تجريبي: استخدم الرمز 123456");
      }
      setCode("");
      setExpiresAt(Date.now() + ttlSec * 1000);
      setStep("code");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (loading) return;
    if (!/^\d{4,8}$/.test(code)) {
      toast.error("أدخل الرمز المكوّن من 6 أرقام");
      return;
    }
    setLoading(true);
    try {
      try {
        const { data } = await api.post("/whatsapp/otp/verify", {
          phone,
          code,
          purpose,
          name: purpose === "signup" ? name : undefined,
        });
        setTokens(data.accessToken, data.refreshToken);
        await refresh();
        toast.success("تم التحقق بنجاح");
        navigate({ to: landingFor(data.user.role) });
        return;
      } catch (err: any) {
        const status = err?.response?.status;
        const apiMsg: string | undefined = err?.response?.data?.error;

        // Map backend errors to precise UI messages + descriptions
        const showApiError = () => {
          const msg = apiMsg || "";
          if (status === 404 || msg.includes("لا يوجد حساب")) {
            toast.error("لا يوجد حساب مرتبط بهذا الرقم", {
              description: "تم تحويلك تلقائياً لإنشاء حساب جديد بنفس الرقم.",
            });
            setPurpose("signup");
            setStep("phone");
            setCode("");
            setExpiresAt(null);
          } else if (msg.includes("انتهت")) {
            toast.error("انتهت صلاحية الرمز", {
              description: "اضغط «إعادة إرسال الرمز» لاستلام رمز جديد صالح لـ 10 دقائق.",
            });
          } else if (status === 429 || msg.includes("تجاوزت")) {
            toast.error("تجاوزت الحد المسموح للمحاولات", {
              description: "اطلب رمزاً جديداً وحاول مرة أخرى.",
            });
          } else if (msg.includes("لا يوجد رمز")) {
            toast.error("لا يوجد رمز نشط لهذا الرقم", {
              description: "اطلب رمزاً جديداً أولاً ثم أعد المحاولة.",
            });
          } else if (msg.includes("غير صحيح") || status === 400) {
            toast.error("الرمز غير صحيح", {
              description: "تأكد من أنك تستخدم آخر رمز وصلك على واتساب.",
            });
          } else {
            toast.error(apiMsg || "تعذّر التحقق من الرمز");
          }
        };

        if (err?.response) {
          showApiError();
          return;
        }
        const expected = typeof window !== "undefined" ? sessionStorage.getItem("ash_demo_otp") : null;
        if (!expected || code !== expected) {
          toast.error("تعذّر الاتصال بالخادم", {
            description: "تحقق من اتصالك بالإنترنت وحاول مجدداً.",
          });
          return;
        }
        const demoUser = {
          id: "demo-client",
          email: `wa-${phone}@demo.sa`,
          name: purpose === "signup" && name ? name : "عميل واتساب",
          role: "CLIENT" as const,
          phone,
          client: { id: "demo-c1", companyName: "شركة تجريبية" },
        };
        setTokens("demo-access", "demo-refresh");
        if (typeof window !== "undefined") {
          localStorage.setItem("ash_demo_user", JSON.stringify(demoUser));
          sessionStorage.removeItem("ash_demo_otp");
          sessionStorage.removeItem("ash_demo_otp_phone");
        }
        await refresh();
        toast.success("تم التحقق بنجاح (وضع تجريبي)");
        navigate({ to: landingFor(demoUser.role) });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <div className="hidden lg:flex relative flex-col justify-between p-10 bg-gradient-to-br from-emerald-500/10 via-transparent to-electric/10 border-l border-border overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-10 right-10 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-96 w-96 rounded-full bg-electric/20 blur-3xl" />
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-4">
            <MessageCircle className="h-3.5 w-3.5" /> تحقق فوري عبر الواتساب
          </div>
          <div className="text-4xl xl:text-5xl font-black leading-tight">
            دخول آمن <span className="gradient-text">بدون كلمة سر</span>
          </div>
          <p className="mt-4 text-muted-foreground max-w-md">
            أدخل رقم هاتفك، وسيصلك رمز تحقق على الواتساب فوراً. آمن، سريع، ومناسب لعملاء المملكة العربية السعودية.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> تنبيهات الدخول والفواتير والعقود تصلك على الواتساب.</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> رمز صالح 10 دقائق، بحد أقصى 5 محاولات.</li>
          </ul>
        </motion.div>
        <div className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} ASH HOLDING</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> العودة لتسجيل الدخول بالبريد
          </Link>
          <h1 className="text-2xl font-black">الدخول عبر الواتساب</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "phone" ? "سنرسل رمز التحقق على رقمك مباشرة." : `أدخل الرمز المرسل إلى ${phone}`}
          </p>

          {step === "phone" ? (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setPurpose("login")}
                  disabled={loading}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${purpose === "login" ? "bg-background shadow" : "text-muted-foreground"}`}
                >
                  دخول
                </button>
                <button
                  type="button"
                  onClick={() => setPurpose("signup")}
                  disabled={loading}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${purpose === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}
                >
                  حساب جديد
                </button>
              </div>
              {purpose === "signup" && (
                <div className="space-y-1.5">
                  <Label>الاسم الكامل</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد الشهري" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>رقم الواتساب</Label>
                <Input
                  dir="ltr"
                  inputMode="tel"
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-right"
                />
                <p className="text-[11px] text-muted-foreground">افتراضي المملكة العربية السعودية (+966). يمكنك كتابة الرقم بصيغة دولية أيضاً.</p>
              </div>
              <Button onClick={requestOtp} disabled={loading} className="w-full gap-2">
                <MessageCircle className="h-4 w-4" />
                {loading ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>رمز التحقق</Label>
                  <span
                    className={`text-xs font-mono tabular-nums ${expired ? "text-destructive" : remaining < 60 ? "text-amber-500" : "text-muted-foreground"}`}
                    aria-live="polite"
                  >
                    {expired ? "انتهت الصلاحية" : `صالح لمدة ${mm}:${ss}`}
                  </span>
                </div>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  disabled={expired || loading}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.6em] font-mono disabled:opacity-60"
                />
              </div>
              {expired ? (
                <Button onClick={requestOtp} disabled={loading} className="w-full gap-2" variant="default">
                  <MessageCircle className="h-4 w-4" />
                  {loading ? "جارٍ الإرسال..." : "إرسال رمز جديد"}
                </Button>
              ) : (
                <Button onClick={verifyOtp} disabled={loading || code.length < 4} className="w-full gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  {loading ? "جارٍ التحقق..." : "تأكيد الرمز والدخول"}
                </Button>
              )}
              <div className="flex items-center justify-between text-xs">
                <button
                  className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                  onClick={() => setStep("phone")}
                  disabled={loading}
                >
                  تغيير الرقم
                </button>
                <button
                  className="text-emerald-400 hover:underline disabled:opacity-40 disabled:no-underline"
                  onClick={requestOtp}
                  disabled={loading || (!expired && remaining > 540)}
                  title={!expired && remaining > 540 ? "يمكنك إعادة الإرسال بعد دقيقة" : ""}
                >
                  إعادة إرسال الرمز
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
