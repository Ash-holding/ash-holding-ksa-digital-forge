import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wallet, FileText, ArrowLeft, Calculator as CalcIcon,
  ShieldCheck, Sparkles, ClipboardList, Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { FinancingCalculator } from "@/components/financing/Calculator";
import { CreditPreviewCard } from "@/components/financing/CreditPreviewCard";

export const Route = createFileRoute("/_authenticated/client/financing")({
  component: ClientFinancingPage,
  head: () => ({
    meta: [
      { title: "تمويل خدمات ASH — طلباتي" },
      { name: "description", content: "احسب قسطك، احصل على تقييم ائتماني فوري، وقدّم طلب تمويل خدمات آش هولدنق." },
    ],
  }),
});

type Row = {
  id: string;
  code: string;
  status: string;
  amount: number | string;
  termMonths: number;
  createdAt: string;
  submittedAt: string | null;
  product: { nameAr: string; code: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-500/10 text-slate-300 ring-slate-500/20",
  SUBMITTED: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
  KYC_REVIEW: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  KYC_APPROVED: "bg-blue-500/10 text-blue-300 ring-blue-500/20",
  KYC_REJECTED: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  CREDIT_REVIEW: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20",
  RISK_REVIEW: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
  COMMITTEE_REVIEW: "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20",
  PENDING_FINAL: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  MORE_INFO: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  REJECTED: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
  EXPIRED: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
};

const STATUS_AR: Record<string, string> = {
  DRAFT: "مسودة", SUBMITTED: "تم التقديم",
  KYC_REVIEW: "تحقق الهوية", KYC_APPROVED: "اعتماد الهوية", KYC_REJECTED: "رفض التحقق",
  CREDIT_REVIEW: "دراسة ائتمانية", RISK_REVIEW: "مراجعة المخاطر",
  COMMITTEE_REVIEW: "اللجنة الائتمانية", PENDING_FINAL: "اعتماد نهائي",
  MORE_INFO: "بحاجة لمعلومات إضافية", APPROVED: "معتمد", REJECTED: "مرفوض",
  CANCELLED: "ملغى", EXPIRED: "منتهي",
};

function ClientFinancingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["client-financing-applications"],
    queryFn: () => api.get<{ rows: Row[] }>("/financing/applications").then((r) => r.data),
    refetchInterval: 15000,
  });

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <ClientPageHeader
        icon={Wallet}
        title="تمويل خدمات ASH"
        description="تقييم ائتماني فوري، حاسبة قسط ذكية، وتتبع لحظي لمراحل طلبك."
        actions={null}
      />

      {/* Trust strip */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          { icon: ShieldCheck, title: "تقييم داخلي معتمد", desc: "نظام نقاط 300–850 شبيه بسمة" },
          { icon: Sparkles, title: "نتيجة فورية", desc: "احصل على تقديرك خلال ثوانٍ" },
          { icon: ClipboardList, title: "تدقيق يدوي", desc: "لجنة ائتمان مستقلة قبل الاعتماد" },
        ].map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-electric/20 to-indigo-500/10 text-electric">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground">{s.title}</div>
                <div className="text-[11px] text-muted-foreground">{s.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Instant Credit Assessment — the star of the show */}
      <CreditPreviewCard />

      {/* Calculator + Products */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-electric">
          <CalcIcon className="h-4 w-4" /> حاسبة القسط وتقديم الطلب
        </div>
        <div className="rounded-3xl border border-border bg-card/40 p-4 md:p-6">
          <FinancingCalculator />
        </div>
      </section>

      {/* Applications */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" /> طلباتي
          </div>
          {rows.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {rows.length} طلب • تحديث تلقائي كل 15 ثانية
            </span>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card/40 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-4 py-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
                  <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted/30" />
                  <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted/20" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">لا توجد طلبات تمويل بعد.</p>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
                استخدم الحاسبة أعلاه لاختيار المنتج ثم اضغط «تقديم الطلب» <ArrowLeft className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <Link
                  key={r.id}
                  to="/client/financing/$id"
                  params={{ id: r.id }}
                  className="block px-4 py-3 hover:bg-white/5 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-electric">{r.code}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ring-1 ${STATUS_STYLES[r.status] || "bg-slate-500/10 ring-slate-500/20"}`}>
                          {STATUS_AR[r.status] || r.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm truncate">{r.product?.nameAr ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat("ar-SA").format(Number(r.amount))} ر.س • {r.termMonths} شهر
                      </div>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
