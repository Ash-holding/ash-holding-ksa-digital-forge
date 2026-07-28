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
  DRAFT: "مسودة",
  SUBMITTED: "تم التقديم",
  KYC_REVIEW: "قيد التحقق من الهوية",
  KYC_APPROVED: "اعتماد الهوية",
  KYC_REJECTED: "رفض التحقق",
  CREDIT_REVIEW: "دراسة ائتمانية",
  RISK_REVIEW: "مراجعة المخاطر",
  COMMITTEE_REVIEW: "اللجنة الائتمانية",
  PENDING_FINAL: "اعتماد نهائي",
  MORE_INFO: "بحاجة لمعلومات إضافية",
  APPROVED: "تمت الموافقة",
  REJECTED: "مرفوض",
  CANCELLED: "ملغى",
  EXPIRED: "منتهي الصلاحية",
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
