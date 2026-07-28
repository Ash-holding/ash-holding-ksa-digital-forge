import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, ShieldCheck, X, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, apiError } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  requestId: string;
  reference: string;
  title: string;
  amount: number;
  duration: number;
  scope?: string | null;
  onSigned?: () => void;
};

export function SignatureDialog({ open, onClose, requestId, reference, title, amount, duration, scope, onSigned }: Props) {
  const [step, setStep] = useState<"review" | "otp">("review");
  const [otp, setOtp] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);

  async function requestOtp() {
    setSending(true);
    try {
      await api.post(`/projects/requests/${requestId}/request-signature`);
      toast.success("تم إرسال رمز التوقيع إلى واتساب");
      setStep("otp");
    } catch (e) { toast.error(apiError(e)); }
    finally { setSending(false); }
  }

  async function sign() {
    if (!agreed) return toast.error("يرجى تأكيد الموافقة على الشروط");
    if (otp.length !== 6) return toast.error("رمز غير مكتمل");
    setSigning(true);
    try {
      await api.post(`/projects/requests/${requestId}/sign`, { otp, agreed: true });
      toast.success("✅ تم توثيق موافقتك رسمياً");
      onSigned?.();
      onClose();
      setStep("review");
      setOtp(""); setAgreed(false);
    } catch (e) { toast.error(apiError(e)); }
    finally { setSigning(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 22 }}
            className="relative z-10 w-full max-w-lg my-auto"
          >
            <div className="rounded-3xl border border-electric/30 bg-gradient-to-br from-card via-card to-electric/5 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* header */}
              <div className="relative p-5 border-b border-border/60 bg-gradient-to-l from-electric/15 to-transparent">
                <button onClick={onClose} className="absolute end-3 top-3 h-8 w-8 grid place-items-center rounded-full hover:bg-muted/40">
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow">
                    {step === "review" ? <PenLine className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">توقيع رقمي معتمد · {reference}</div>
                    <div className="font-black text-[15px] truncate">{step === "review" ? "مراجعة العرض والتوقيع" : "أدخل رمز التوقيع"}</div>
                  </div>
                </div>
              </div>

              {step === "review" ? (
                <div className="p-5 space-y-4">
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="text-[11px] text-muted-foreground mb-1">المشروع</div>
                    <div className="font-bold text-[14px] mb-3">{title}</div>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div><div className="text-muted-foreground text-[10px]">القيمة</div><div className="font-black text-electric">{amount.toLocaleString("ar-SA")} ر.س</div></div>
                      <div><div className="text-muted-foreground text-[10px]">المدة</div><div className="font-black">{duration} يوم</div></div>
                    </div>
                    {scope && (
                      <div className="mt-3 pt-3 border-t border-border/60">
                        <div className="text-[10px] text-muted-foreground mb-1">نطاق العمل</div>
                        <div className="text-[12px] whitespace-pre-wrap leading-relaxed">{scope}</div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] text-amber-500 leading-relaxed">
                    عند الضغط على «طلب رمز التوقيع» سيتم إرسال رمز تحقّق مكوّن من 6 أرقام إلى واتساب الرقم المرتبط بحسابك. الرمز صالح لمدة 15 دقيقة ويُعتبر توقيعك رسمياً وملزماً قانونياً.
                  </div>

                  <Button onClick={requestOtp} disabled={sending}
                    className="w-full gap-2 bg-gradient-to-r from-electric to-purple-accent shadow-glow h-11">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    {sending ? "جارٍ الإرسال…" : "طلب رمز التوقيع عبر واتساب"}
                  </Button>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  <div className="text-center">
                    <div className="text-[12px] text-muted-foreground mb-3">أدخل الرمز المرسل إلى واتساب</div>
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric" maxLength={6}
                      className="text-center text-3xl tracking-[0.8em] font-black h-16"
                      dir="ltr" placeholder="••••••"
                    />
                    <button onClick={requestOtp} disabled={sending}
                      className="mt-2 text-[11px] text-electric hover:underline">
                      إعادة إرسال الرمز
                    </button>
                  </div>

                  <label className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 cursor-pointer">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 accent-electric h-4 w-4" />
                    <span className="text-[11px] leading-relaxed text-muted-foreground">
                      أوافق على شروط العرض المذكورة وأؤكد أنّ هذا التوقيع الرقمي ملزم قانونياً بموجب نظام التعاملات الإلكترونية بالمملكة العربية السعودية.
                    </span>
                  </label>

                  <Button onClick={sign} disabled={signing || otp.length !== 6 || !agreed}
                    className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 h-11">
                    {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {signing ? "جارٍ التوثيق…" : "توقيع وإصدار الفاتورة"}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
