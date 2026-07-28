import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageShell } from "@/components/site/PageShell";
import { api } from "@/lib/api";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, ArrowRight, Calendar, User, Wallet, Hash, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify/receipt/$code")({
  component: VerifyReceiptPage,
  head: ({ params }) => ({
    meta: [
      { title: `التحقق من ${params.code} | ASH HOLDING` },
      { name: "description", content: `نتيجة التحقق من صحة الإيصال ${params.code} الصادر عن شركة علي صالح الشهري القابضة.` },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type VerifyResult = {
  ok: boolean;
  found: boolean;
  receiptNumber?: string;
  invoiceNumber?: string;
  status?: string;
  isPaid?: boolean;
  isValid?: boolean;
  total?: number;
  currency?: string;
  issuedAt?: string;
  paidAt?: string | null;
  beneficiary?: string;
  projectTitle?: string | null;
  payment?: { id: string; method: string; amount: number; paidAt: string | null; ref: string | null } | null;
  verifiedAt?: string;
  error?: string;
  code?: string;
};

const METHOD_AR: Record<string, string> = {
  WALLET: "المحفظة الرقمية",
  BANK_TRANSFER: "تحويل بنكي",
  CARD: "بطاقة",
  CASH: "نقداً",
  MADA: "مدى",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
}

function VerifyReceiptPage() {
  const { code } = Route.useParams();

  const { data, isLoading, isError, refetch } = useQuery<VerifyResult>({
    queryKey: ["verify-receipt", code],
    queryFn: async () => {
      try {
        const res = await api.get<VerifyResult>(`/verify/receipt/${encodeURIComponent(code)}`);
        return res.data;
      } catch (e: any) {
        if (e?.response?.data) return e.response.data as VerifyResult;
        throw e;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/verify" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-electric transition-colors">
            <ArrowRight className="h-4 w-4 rtl:rotate-180" /> بحث آخر
          </Link>
          <span className="font-mono text-xs text-muted-foreground tracking-widest">{code}</span>
        </div>

        {isLoading && <SkeletonCard />}

        {!isLoading && isError && (
          <ResultCard tone="error" icon={ShieldX} title="تعذّر إتمام التحقق" subtitle="حدث خطأ في الاتصال بالخادم — حاول مرة أخرى.">
            <Button onClick={() => refetch()} className="gap-2"><Loader2 className="h-4 w-4" /> إعادة المحاولة</Button>
          </ResultCard>
        )}

        {!isLoading && data && !data.found && (
          <ResultCard
            tone="warning"
            icon={ShieldAlert}
            title="لم يتم العثور على هذا الإيصال"
            subtitle={data.error || "الرمز المدخل غير موجود في سجلاتنا. تأكد من كتابة الرقم بشكل صحيح."}
          >
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link to="/verify">بحث آخر</Link></Button>
              <Button asChild><Link to="/contact">تواصل مع الشركة</Link></Button>
            </div>
          </ResultCard>
        )}

        {!isLoading && data && data.found && data.isValid && (
          <VerifiedCard data={data} />
        )}

        {!isLoading && data && data.found && !data.isValid && (
          <ResultCard
            tone="warning"
            icon={ShieldAlert}
            title="الفاتورة غير مسددة بعد"
            subtitle={`تم العثور على الفاتورة ${data.invoiceNumber} لكنها لم تُسدّد حتى الآن (الحالة: ${data.status}). لا يوجد إيصال سداد صالح لهذا الرقم.`}
          >
            <Button asChild variant="outline"><Link to="/verify">بحث آخر</Link></Button>
          </ResultCard>
        )}
      </div>
    </PageShell>
  );
}

function VerifiedCard({ data }: { data: VerifyResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-card shadow-glow"
    >
      {/* watermark */}
      <div className="pointer-events-none absolute -left-10 top-1/2 -translate-y-1/2 opacity-[0.06] rotate-[-20deg]">
        <ShieldCheck className="h-72 w-72 text-emerald-700" />
      </div>

      <div className="relative p-6 sm:p-10">
        <motion.div
          initial={{ scale: 0.6, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_10px_40px_rgba(16,185,129,0.5)]"
        >
          <ShieldCheck className="h-12 w-12" />
        </motion.div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold tracking-widest mb-3">
            ✓ إيصال موثّق ومُتحقّق منه
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">تم التحقق بنجاح</h1>
          <p className="text-sm text-muted-foreground mt-2">
            هذا الإيصال صادر رسمياً عن <span className="font-semibold text-foreground">شركة علي صالح الشهري القابضة</span> ومسجّل في قاعدة البيانات.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <InfoRow icon={Hash} label="رقم الإيصال" value={data.receiptNumber || "—"} mono />
          <InfoRow icon={FileText} label="رقم الفاتورة" value={data.invoiceNumber || "—"} mono />
          <InfoRow
            icon={Wallet}
            label="المبلغ المسدد"
            value={<span className="font-black text-emerald-700 dark:text-emerald-400">{(data.total ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} {data.currency || "ر.س"}</span>}
          />
          <InfoRow icon={Wallet} label="طريقة السداد" value={METHOD_AR[data.payment?.method || ""] || data.payment?.method || "—"} />
          <InfoRow icon={Calendar} label="تاريخ السداد" value={fmtDate(data.paidAt)} />
          <InfoRow icon={Calendar} label="تاريخ الإصدار" value={fmtDate(data.issuedAt)} />
          <InfoRow icon={User} label="المستفيد" value={data.beneficiary || "—"} />
          <InfoRow icon={Building2} label="المشروع / الخدمة" value={data.projectTitle || "خدمات مهنية"} />
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm leading-relaxed text-foreground/80">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              نشهد بأن الإيصال أعلاه صحيح ومطابق للسجل الرسمي لدى الشركة بتاريخ التحقق{" "}
              <span className="font-semibold">{fmtDate(data.verifiedAt)}</span>. أي محاولة تعديل على المستند الورقي/الرقمي تُفقده حجيّته.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <Button asChild variant="outline"><Link to="/verify">تحقق من إيصال آخر</Link></Button>
          <Button asChild><Link to="/contact">تواصل معنا</Link></Button>
        </div>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 backdrop-blur p-4 flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-electric/10 text-electric">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className={`font-semibold text-foreground truncate ${mono ? "font-mono tracking-wider text-sm" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

function ResultCard({
  tone, icon: Icon, title, subtitle, children,
}: { tone: "error" | "warning"; icon: any; title: string; subtitle: string; children?: React.ReactNode }) {
  const toneClass = tone === "error"
    ? "border-red-500/50 from-red-50/80 to-white dark:from-red-950/30"
    : "border-amber-500/50 from-amber-50/80 to-white dark:from-amber-950/30";
  const iconBg = tone === "error" ? "from-red-500 to-red-700" : "from-amber-500 to-amber-700";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border-2 ${toneClass} bg-gradient-to-br dark:to-card p-8 text-center shadow-card`}
    >
      <div className={`mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br ${iconBg} text-white shadow-lg`}>
        <Icon className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-black text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">{subtitle}</p>
      <div className="flex justify-center">{children}</div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-border bg-card p-10 text-center">
      <Loader2 className="h-12 w-12 mx-auto text-electric animate-spin mb-4" />
      <p className="text-muted-foreground">جارٍ التحقق من الإيصال…</p>
    </div>
  );
}
