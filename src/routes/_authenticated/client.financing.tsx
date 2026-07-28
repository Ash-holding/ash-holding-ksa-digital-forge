import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, FileText, ArrowLeft, Calculator as CalcIcon } from "lucide-react";
import { api } from "@/lib/api";
import { ClientPageHeader } from "@/components/client/ClientPageHeader";
import { FinancingCalculator } from "@/components/financing/Calculator";

export const Route = createFileRoute("/_authenticated/client/financing")({
  component: ClientFinancingPage,
  head: () => ({
    meta: [
      { title: "تمويل خدمات ASH — طلباتي" },
      { name: "description", content: "تابع طلبات تمويل خدمات آش هولدنق ومراحل الدراسة والاعتماد." },
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
        description="احسب قسطك التقديري، قدّم طلب تمويل، وتابع مراحل الدراسة والاعتماد."
        actions={null}
      />

      {/* Calculator + Apply — restricted to authenticated clients */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-electric">
          <CalcIcon className="h-4 w-4" /> احسب قسطك التقديري وابدأ طلبك
        </div>
        <FinancingCalculator />
      </section>

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">طلباتي</div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">جاري التحميل…</div>
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
    </div>
  );
}
