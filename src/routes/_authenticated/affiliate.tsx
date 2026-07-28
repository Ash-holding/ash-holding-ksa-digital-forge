import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Clock, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AffiliateLayout } from "@/components/dashboard/AffiliateLayout";

export const Route = createFileRoute("/_authenticated/affiliate")({
  component: AffiliateGate,
});

function AffiliateGate() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-me"],
    queryFn: async () => (await api.get("/affiliate/me")).data as {
      affiliate: { id: string; status: string; code: string; displayName: string } | null;
      application?: { id: string; status: string; reviewNote?: string | null; createdAt: string } | null;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const affiliate = data?.affiliate;
  const application = data?.application;

  // Not yet an affiliate — show status card (application pending / rejected / need to apply)
  if (!affiliate || affiliate.status !== "ACTIVE") {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-background via-background to-amber-950/10 grid place-items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full rounded-3xl border border-amber-500/20 bg-card/60 backdrop-blur p-8 space-y-5 text-center"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center shadow-glow">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          {!affiliate && !application && (
            <>
              <h1 className="text-2xl font-bold">انضم لبرنامج شركاء ASH</h1>
              <p className="text-muted-foreground text-sm leading-loose">
                ابدأ رحلتك كمسوّق واحصل على عمولة على كل عميل تحوّله لنا.
                عمولات تنافسية، لوحة تحكم متطوّرة، ودعم مباشر.
              </p>
              <Link to="/affiliate/apply"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90">
                قدّم طلب الانضمام <ArrowLeft className="h-4 w-4" />
              </Link>
            </>
          )}
          {application && ["NEW", "UNDER_REVIEW"].includes(application.status) && (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold">طلبك قيد المراجعة</h1>
              <p className="text-muted-foreground text-sm">
                نراجع طلب انضمامك حالياً وسنعود إليك خلال 24-48 ساعة عبر الواتساب.
              </p>
              <div className="text-xs text-muted-foreground">
                رقم الطلب: <span className="font-mono font-bold">{application.id.slice(-6).toUpperCase()}</span>
              </div>
            </>
          )}
          {application?.status === "REJECTED" && (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-500/10">
                <XCircle className="h-6 w-6 text-rose-500" />
              </div>
              <h1 className="text-2xl font-bold">لم يتم قبول طلبك</h1>
              {application.reviewNote && (
                <div className="rounded-xl bg-muted/40 p-3 text-sm">{application.reviewNote}</div>
              )}
              <Link to="/affiliate/apply" className="inline-block rounded-xl border border-border px-5 py-2 text-sm font-semibold">
                تقديم طلب جديد
              </Link>
            </>
          )}
          {application?.status === "APPROVED" && !affiliate && (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold">تمت الموافقة على طلبك</h1>
              <p className="text-muted-foreground text-sm">جارٍ إنشاء حسابك... حدّث الصفحة بعد قليل.</p>
            </>
          )}
          {affiliate && affiliate.status === "SUSPENDED" && (
            <>
              <h1 className="text-2xl font-bold">حسابك مُعلّق مؤقتاً</h1>
              <p className="text-muted-foreground text-sm">تواصل مع الدعم لاستئناف نشاطك.</p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <AffiliateLayout>
      <Outlet />
    </AffiliateLayout>
  );
}
