// Financing application lifecycle helpers.
// Central role→stage map + status transition table. Enforced by the API.
import type { UserRole, FinancingDecisionStage, FinancingApplicationStatus } from "@prisma/client";
import { prisma } from "../prisma.js";
import { sendWhatsAppText, normalizePhone } from "../whatsapp.js";

export const STAGE_ROLES: Record<FinancingDecisionStage, UserRole[]> = {
  KYC: ["COMPLIANCE_OFFICER", "ADMIN", "SUPER_ADMIN"],
  CREDIT: ["CREDIT_ANALYST", "CREDIT_MANAGER", "ADMIN", "SUPER_ADMIN"],
  RISK: ["RISK_OFFICER", "CREDIT_MANAGER", "ADMIN", "SUPER_ADMIN"],
  COMMITTEE: ["CREDIT_COMMITTEE", "CREDIT_MANAGER", "CFO", "ADMIN", "SUPER_ADMIN"],
  FINAL: ["FINAL_APPROVER", "SUPER_ADMIN"],
};

// Next status after APPROVE at each stage
export const NEXT_ON_APPROVE: Record<FinancingDecisionStage, FinancingApplicationStatus> = {
  KYC: "CREDIT_REVIEW",
  CREDIT: "RISK_REVIEW",
  RISK: "COMMITTEE_REVIEW",
  COMMITTEE: "PENDING_FINAL",
  FINAL: "APPROVED",
};

export const STAGE_FOR_STATUS: Partial<Record<FinancingApplicationStatus, FinancingDecisionStage>> = {
  SUBMITTED: "KYC",
  KYC_REVIEW: "KYC",
  KYC_APPROVED: "CREDIT",
  CREDIT_REVIEW: "CREDIT",
  RISK_REVIEW: "RISK",
  COMMITTEE_REVIEW: "COMMITTEE",
  PENDING_FINAL: "FINAL",
};

/** Compute a naive credit score from applicant fields (0..100). Not a decision. */
export function computeInternalScore(input: {
  monthlyIncome?: number | null;
  monthlyObligations?: number | null;
  amount: number;
  termMonths: number;
  yearsOfService?: number | null;
}): number {
  const income = Number(input.monthlyIncome || 0);
  const oblig = Number(input.monthlyObligations || 0);
  const dti = income > 0 ? oblig / income : 1;
  const installment = input.amount / Math.max(1, input.termMonths);
  const installmentToIncome = income > 0 ? installment / income : 1;
  const years = Math.min(15, Math.max(0, Number(input.yearsOfService || 0)));

  let score = 60;
  score -= Math.round(dti * 40);              // heavier obligations → lower
  score -= Math.round(installmentToIncome * 60);
  score += Math.round(years * 1.5);
  if (income >= 8000) score += 6;
  if (income >= 15000) score += 6;
  return Math.max(0, Math.min(100, score));
}

/** Append an event to the timeline (best-effort). */
export async function appendEvent(input: {
  applicationId: string;
  actorId?: string | null;
  actorRole?: string | null;
  type: string;
  fromStatus?: FinancingApplicationStatus | null;
  toStatus?: FinancingApplicationStatus | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await prisma.financingApplicationEvent.create({
      data: {
        applicationId: input.applicationId,
        actorId: input.actorId ?? undefined,
        actorRole: input.actorRole ?? undefined,
        type: input.type,
        fromStatus: input.fromStatus ?? undefined,
        toStatus: input.toStatus ?? undefined,
        message: input.message ?? undefined,
        metadata: (input.metadata ?? undefined) as never,
      },
    });
  } catch (e) {
    console.error("financing event append failed", e);
  }
}

export const STATUS_LABEL_AR: Record<FinancingApplicationStatus, string> = {
  DRAFT: "مسودة قيد الإعداد",
  SUBMITTED: "تم استلام الطلب رسمياً",
  KYC_REVIEW: "قيد التحقق من الهوية والامتثال (KYC/AML)",
  KYC_APPROVED: "اعتماد الهوية — إحالة للدراسة الائتمانية",
  KYC_REJECTED: "تعذّر التحقق من الهوية",
  CREDIT_REVIEW: "قيد الدراسة الائتمانية",
  RISK_REVIEW: "قيد تقييم المخاطر",
  COMMITTEE_REVIEW: "معروض على اللجنة الائتمانية",
  PENDING_FINAL: "بانتظار الاعتماد النهائي",
  MORE_INFO: "يتطلّب مستندات/معلومات إضافية",
  APPROVED: "تمت الموافقة النهائية",
  REJECTED: "اعتذار عن الطلب",
  CANCELLED: "تم إلغاء الطلب",
  EXPIRED: "انتهت صلاحية الطلب",
};

export async function notifyApplicant(applicationId: string, message: string) {
  try {
    const app = await prisma.financingApplication.findUnique({
      where: { id: applicationId },
      include: { product: true },
    });
    if (!app) return;
    const user = await prisma.user.findUnique({ where: { id: app.applicantId }, select: { phone: true } });
    const to = normalizePhone(user?.phone);
    if (!to) return;
    await sendWhatsAppText(to, message);
  } catch (e) {
    console.error("financing notify failed", e);
  }
}

// ============================================================
// Bank-style formal WhatsApp templates — mimics Saudi bank SMS
// ============================================================
const NOW_AR = () =>
  new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh",
  }).format(new Date());

const HEADER = "🏛️ شركة آش القابضة | التمويل الخدمي الداخلي";
const DIVIDER = "ــــــــــــــــــــــــــــــــــــ";
const FOOTER = (code: string) =>
  `\n${DIVIDER}\n📄 المرجع: ${code}\n🕘 ${NOW_AR()} (توقيت الرياض)\n📞 الدعم: 920000000 | ash-holding.sa\n© جميع الحقوق محفوظة — ASH HOLDING`;

const fmtSAR = (n: number | string | null | undefined) => {
  const v = Number(n || 0);
  return `${v.toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ﷼`;
};

export type BankNoticeKind =
  | "RECEIVED" | "IN_REVIEW" | "MORE_INFO"
  | "APPROVED" | "REJECTED" | "STATUS_UPDATE"
  | "CONTRACT_READY" | "CONTRACT_SIGNED"
  | "PROMISSORY_SENT" | "PROMISSORY_ACCEPTED"
  | "ACTIVATED"
  | "INSTALLMENT_DUE" | "INSTALLMENT_PAID" | "OVERDUE";

export function bankMessage(
  kind: BankNoticeKind,
  ctx: {
    code: string;
    amount?: number | string | null;
    installment?: number | string | null;
    dueDate?: string | null;
    reasonAr?: string | null;
    statusAr?: string | null;
    productAr?: string | null;
  },
): string {
  const L: string[] = [HEADER, ""];
  switch (kind) {
    case "RECEIVED":
      L.push("✅ إشعار استلام طلب تمويل",
        `تم استلام طلبكم${ctx.productAr ? ` لمنتج «${ctx.productAr}»` : ""}.`,
        ctx.amount ? `المبلغ المطلوب: ${fmtSAR(ctx.amount)}` : "",
        "سيتم إشعاركم فور اكتمال الدراسة الائتمانية.");
      break;
    case "IN_REVIEW":
      L.push("🔍 تحديث حالة الطلب",
        `الحالة الحالية: ${ctx.statusAr || "قيد المراجعة"}`,
        "لا يلزمكم أي إجراء حالياً. سنُعلمكم بأي تحديث.");
      break;
    case "MORE_INFO":
      L.push("📋 طلب معلومات/مستندات إضافية",
        ctx.reasonAr || "الرجاء الدخول إلى بوابة العميل ورفع المستندات المطلوبة لاستكمال الدراسة.");
      break;
    case "APPROVED":
      L.push("🎉 موافقة على طلب التمويل",
        `تم اعتماد تمويل بمبلغ ${fmtSAR(ctx.amount || 0)}.`,
        "يُرجى الدخول إلى بوابة العميل لمراجعة العرض وتوقيع العقد إلكترونياً.");
      break;
    case "REJECTED":
      L.push("⚠️ اعتذار عن تلبية الطلب",
        "نأسف لإفادتكم بعدم تمكننا من تلبية طلب التمويل في الوقت الحالي.",
        ctx.reasonAr ? `السبب: ${ctx.reasonAr}` : "",
        "يمكنكم إعادة التقديم بعد ٣٠ يوماً.");
      break;
    case "CONTRACT_READY":
      L.push("📝 عقد التمويل جاهز للتوقيع",
        "تم إصدار عقد التمويل رقمياً وينتظر توقيعكم.",
        "الرجاء الدخول إلى بوابة العميل لمراجعة الشروط والتوقيع بـ OTP.");
      break;
    case "CONTRACT_SIGNED":
      L.push("🔏 استلام توقيع العقد",
        "تم تسجيل توقيعكم الإلكتروني بنجاح وحفظه ببصمة رقمية (SHA-256).",
        "الخطوة التالية: إصدار السند التنفيذي الرسمي وإرساله لموافقتكم.");
      break;
    case "PROMISSORY_SENT":
      L.push("📜 إشعار إصدار السند التنفيذي",
        `تم إصدار سند تنفيذي رسمي بقيمة ${fmtSAR(ctx.amount || 0)} استناداً إلى عقد التمويل الموقّع.`,
        "الرجاء الدخول إلى بوابة العميل للاطلاع على السند والموافقة عليه إلكترونياً.",
        "⚠️ فور موافقتكم يتم صرف رصيد الخدمات فوراً إلى محفظتكم.");
      break;
    case "PROMISSORY_ACCEPTED":
      L.push("✅ توثيق قبول السند التنفيذي",
        "تم تسجيل موافقتكم على السند التنفيذي رسمياً وحفظها في السجل القانوني.",
        "جارٍ الآن صرف رصيد الخدمات إلى محفظتكم…");
      break;
    case "ACTIVATED":
      L.push("💳 إشعار صرف رصيد الخدمات",
        `تم قيد مبلغ ${fmtSAR(ctx.amount || 0)} في محفظة الخدمات الخاصة بكم.`,
        "الرصيد متاح فوراً لاستخدامه في سداد فواتير خدمات آش القابضة.",
        "ملاحظة نظامية: رصيد الخدمات غير قابل للسحب النقدي.");
      break;
    case "INSTALLMENT_DUE":
      L.push("⏰ تذكير باستحقاق قسط",
        `قيمة القسط: ${fmtSAR(ctx.installment || 0)}`,
        ctx.dueDate ? `تاريخ الاستحقاق: ${ctx.dueDate}` : "",
        "يمكنكم السداد من المحفظة أو تفعيل السداد التلقائي.");
      break;
    case "INSTALLMENT_PAID":
      L.push("✅ إشعار استلام دفعة",
        `تم استلام مبلغ ${fmtSAR(ctx.installment || 0)}`,
        "شكراً لالتزامكم بالسداد في موعده.");
      break;
    case "OVERDUE":
      L.push("🚨 تنبيه تأخر عن السداد",
        `القسط المستحق: ${fmtSAR(ctx.installment || 0)}`,
        "يُرجى المبادرة بالسداد لتفادي رسوم التأخر وأثر ذلك على السجل الائتماني الداخلي.");
      break;
    case "STATUS_UPDATE":
    default:
      L.push("🔄 تحديث حالة",
        `الحالة الجديدة: ${ctx.statusAr || "—"}`);
  }
  L.push(FOOTER(ctx.code));
  return L.filter(Boolean).join("\n");
}

