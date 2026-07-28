import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, ShieldCheck, X, Loader2, MessageCircle, FileText, ArrowRight, ArrowLeft, ScrollText } from "lucide-react";
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

type Step = "review" | "contract" | "otp";

export function SignatureDialog({ open, onClose, requestId, reference, title, amount, duration, scope, onSigned }: Props) {
  const [step, setStep] = useState<Step>("review");
  const [otp, setOtp] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [readContract, setReadContract] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);

  const today = new Date().toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" });

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
      setOtp(""); setAgreed(false); setReadContract(false);
    } catch (e) { toast.error(apiError(e)); }
    finally { setSigning(false); }
  }

  const stepTitle = step === "review" ? "مراجعة العرض" : step === "contract" ? "مسودة العقد الرسمي" : "أدخل رمز التوقيع";
  const StepIcon = step === "review" ? PenLine : step === "contract" ? ScrollText : ShieldCheck;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            transition={{ type: "spring", damping: 22 }}
            className="relative z-10 w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex"
          >
            <div className="flex flex-col w-full sm:rounded-3xl border border-electric/30 bg-gradient-to-br from-card via-card to-electric/5 shadow-2xl overflow-hidden">
              {/* header */}
              <div className="relative shrink-0 p-5 border-b border-border/60 bg-gradient-to-l from-electric/15 to-transparent">
                <button onClick={onClose} className="absolute end-3 top-3 h-8 w-8 grid place-items-center rounded-full hover:bg-muted/40">
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow shrink-0">
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">توقيع رقمي معتمد · {reference}</div>
                    <div className="font-black text-[15px] truncate">{stepTitle}</div>
                  </div>
                </div>
                {/* progress dots */}
                <div className="mt-3 flex items-center gap-1.5">
                  {(["review","contract","otp"] as Step[]).map((s, i) => {
                    const active = s === step;
                    const done = (["review","contract","otp"] as Step[]).indexOf(step) > i;
                    return (
                      <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${active ? "bg-electric" : done ? "bg-emerald-500" : "bg-border"}`} />
                    );
                  })}
                </div>
              </div>

              {step === "review" && (
                <>
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="text-[11px] text-foreground/60 mb-1">المشروع</div>
                      <div className="font-bold text-[15px] text-foreground mb-3">{title}</div>
                      <div className="grid grid-cols-2 gap-3 text-[13px]">
                        <div><div className="text-foreground/60 text-[10px] mb-0.5">القيمة</div><div className="font-black text-electric text-base">{amount.toLocaleString("ar-SA")} ر.س</div></div>
                        <div><div className="text-foreground/60 text-[10px] mb-0.5">المدة</div><div className="font-black text-foreground text-base">{duration} يوم</div></div>
                      </div>
                      {scope && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-[10px] text-foreground/60 mb-1">نطاق العمل</div>
                          <div className="text-[13px] whitespace-pre-wrap leading-relaxed text-foreground/90">{scope}</div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-[12px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                      📄 <strong>العقد الرسمي</strong> يُصدر تلقائياً بعد التوقيع الرقمي وسداد الفاتورة. يمكنك الآن قراءة <strong>مسودة العقد الكاملة</strong> قبل التوقيع.
                    </div>
                  </div>
                  <div className="shrink-0 p-4 border-t border-border/60 bg-background/50">
                    <Button onClick={() => setStep("contract")}
                      className="w-full gap-2 bg-gradient-to-r from-electric to-purple-accent shadow-glow h-12 text-white font-bold">
                      <FileText className="h-4 w-4" />
                      قراءة مسودة العقد
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {step === "contract" && (
                <>
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="rounded-2xl border-2 border-electric/40 bg-white dark:bg-background p-5 sm:p-6 text-foreground text-[13px] leading-[1.9] space-y-4 shadow-inner">
                      <div className="text-center border-b border-border pb-3">
                        <div className="text-[11px] text-muted-foreground mb-1">المملكة العربية السعودية · نظام التعاملات الإلكترونية م/١٨</div>
                        <div className="font-black text-lg text-electric">عقد تقديم خدمات — مسودة</div>
                        <div className="text-[11px] text-muted-foreground mt-1">مرجع: {reference} · {today}</div>
                      </div>

                      <p className="text-foreground/90">
                        بسم الله الرحمن الرحيم، أُبرم هذا العقد بين <strong>مجموعة آش القابضة (ASH Holding)</strong> — «الطرف الأول / مقدّم الخدمة» — و<strong>العميل الموقّع أدناه رقمياً</strong> — «الطرف الثاني / المستفيد» — بكامل الأهلية المعتبرة شرعاً ونظاماً، وقد اتفقا على ما يلي:
                      </p>

                      <div>
                        <div className="font-bold text-electric mb-1">المادة الأولى — نطاق العمل</div>
                        <div className="text-foreground/90">
                          يلتزم الطرف الأول بتنفيذ مشروع «<strong>{title}</strong>» وفق النطاق التالي:
                          <div className="mt-1 whitespace-pre-wrap bg-muted/40 rounded-lg p-3 text-[12.5px]">{scope || "—"}</div>
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-electric mb-1">المادة الثانية — المقابل المالي</div>
                        <div className="text-foreground/90">
                          القيمة الإجمالية للعقد <strong className="text-electric">{amount.toLocaleString("ar-SA")} ريال سعودي</strong> شاملة ضريبة القيمة المضافة، تُسدَّد عبر الفاتورة الإلكترونية التي تُصدر تلقائياً بعد التوقيع الرقمي. لا يبدأ التنفيذ إلا بعد تأكيد السداد.
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-electric mb-1">المادة الثالثة — مدة التنفيذ</div>
                        <div className="text-foreground/90">
                          مدة التنفيذ <strong>{duration} يوم عمل</strong> تبدأ من تاريخ تأكيد السداد، ويُسمح بتمديدها في حال طلب العميل تعديلات جوهرية خارج النطاق المتفق عليه.
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-electric mb-1">المادة الرابعة — التزامات الطرف الأول</div>
                        <ul className="list-disc pr-5 text-foreground/90 space-y-1">
                          <li>تنفيذ العمل باحترافية وجودة وفق أفضل الممارسات المهنية.</li>
                          <li>تسليم المخرجات ضمن المدة المتفق عليها.</li>
                          <li>تقديم الدعم الفني وإصلاح الأخطاء البرمجية لمدة (30) يوماً بعد التسليم.</li>
                          <li>الحفاظ على سرية بيانات العميل وعدم مشاركتها مع أي طرف ثالث.</li>
                        </ul>
                      </div>

                      <div>
                        <div className="font-bold text-electric mb-1">المادة الخامسة — التزامات الطرف الثاني</div>
                        <ul className="list-disc pr-5 text-foreground/90 space-y-1">
                          <li>تزويد الطرف الأول بجميع المعلومات والملفات اللازمة لتنفيذ العمل.</li>
                          <li>الرد على استفسارات فريق العمل خلال (48) ساعة عمل.</li>
                          <li>سداد المقابل المالي كاملاً وفق آلية الدفع المتفق عليها.</li>
                        </ul>
                      </div>

                      <div>
                        <div className="font-bold text-electric mb-1">المادة السادسة — الملكية الفكرية</div>
                        <div className="text-foreground/90">
                          تنتقل حقوق الملكية الفكرية للمخرجات النهائية إلى العميل بعد سداد كامل قيمة العقد، مع احتفاظ الطرف الأول بحق عرض المشروع في معرض أعماله ما لم يُتفق كتابياً على خلاف ذلك.
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-electric mb-1">المادة السابعة — الفسخ والتعديل</div>
                        <div className="text-foreground/90">
                          لا يجوز فسخ العقد إلا باتفاق كتابي بين الطرفين. أي تعديل على النطاق أو المدة أو القيمة يستوجب ملحقاً موقّعاً رقمياً من الطرفين.
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-electric mb-1">المادة الثامنة — التوقيع الرقمي والاختصاص</div>
                        <div className="text-foreground/90">
                          يُعدّ التوقيع الرقمي عبر رمز التحقق (OTP) المرسل إلى واتساب المرتبط بحساب العميل توقيعاً رسمياً وملزماً وفق نظام التعاملات الإلكترونية م/١٨. تختص محاكم المملكة العربية السعودية بالنظر في أي نزاع ينشأ عن تنفيذ هذا العقد.
                        </div>
                      </div>

                      <div className="border-t border-border pt-3 text-[11px] text-muted-foreground text-center">
                        هذه مسودة قابلة للقراءة قبل التوقيع. النسخة النهائية المختومة بختم التوقيع الرقمي (SHA-256) وIP وتاريخ السداد ستكون متاحة للتحميل بصيغة PDF من صفحة «العقود» بعد إتمام السداد.
                      </div>
                    </div>

                    <label className="flex items-start gap-2 rounded-xl border-2 border-electric/30 bg-electric/5 p-3 cursor-pointer">
                      <input type="checkbox" checked={readContract} onChange={(e) => setReadContract(e.target.checked)}
                        className="mt-0.5 accent-electric h-4 w-4 shrink-0" />
                      <span className="text-[13px] leading-relaxed text-foreground font-medium">
                        أُقرّ بأنني قرأتُ مسودة العقد بكامل موادها الثمانية وفهمتُ محتواها.
                      </span>
                    </label>
                  </div>
                  <div className="shrink-0 p-4 border-t border-border/60 bg-background/50 flex gap-2">
                    <Button variant="outline" onClick={() => setStep("review")} className="gap-1 h-12">
                      <ArrowRight className="h-4 w-4" />
                      رجوع
                    </Button>
                    <Button onClick={requestOtp} disabled={sending || !readContract}
                      className="flex-1 gap-2 bg-gradient-to-r from-electric to-purple-accent shadow-glow h-12 text-white font-bold disabled:opacity-50">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                      {sending ? "جارٍ الإرسال…" : "متابعة والتوقيع عبر واتساب"}
                    </Button>
                  </div>
                </>
              )}

              {step === "otp" && (
                <>
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="text-center">
                      <div className="text-[13px] text-foreground/80 mb-3 font-medium">أدخل الرمز المرسل إلى واتساب</div>
                      <Input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric" maxLength={6}
                        className="text-center text-3xl tracking-[0.8em] font-black h-16 text-foreground"
                        dir="ltr" placeholder="••••••"
                      />
                      <button onClick={requestOtp} disabled={sending}
                        className="mt-2 text-[12px] text-electric hover:underline font-semibold">
                        إعادة إرسال الرمز
                      </button>
                    </div>

                    <label className="flex items-start gap-2 rounded-xl border border-border bg-background p-3 cursor-pointer">
                      <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 accent-electric h-4 w-4 shrink-0" />
                      <span className="text-[12px] leading-relaxed text-foreground/85">
                        أوافق على شروط العقد المذكورة أعلاه وأؤكد أنّ هذا التوقيع الرقمي ملزم قانونياً بموجب نظام التعاملات الإلكترونية بالمملكة العربية السعودية.
                      </span>
                    </label>
                  </div>
                  <div className="shrink-0 p-4 border-t border-border/60 bg-background/50 flex gap-2">
                    <Button variant="outline" onClick={() => setStep("contract")} className="gap-1 h-12">
                      <ArrowRight className="h-4 w-4" />
                      رجوع
                    </Button>
                    <Button onClick={sign} disabled={signing || otp.length !== 6 || !agreed}
                      className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 h-12 text-white font-bold disabled:opacity-50">
                      {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {signing ? "جارٍ التوثيق…" : "توقيع وإصدار الفاتورة"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
