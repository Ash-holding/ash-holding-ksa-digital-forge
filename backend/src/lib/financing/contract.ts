// Contract generation & activation helpers for the ASH financing lifecycle.
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../prisma.js";
import { computeQuote } from "./calculator.js";
import { appendEvent, notifyApplicant } from "./lifecycle.js";
import type { FinancingApplication, FinancingProduct } from "@prisma/client";

function code() {
  const y = new Date().getFullYear();
  const s = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `FIN-${y}-${s}`;
}

/**
 * Generate a contract (DRAFT → AWAITING_CLIENT_SIGNATURE) from an APPROVED application.
 * Idempotent: returns the existing contract if one already exists.
 */
export async function generateContractForApplication(
  applicationId: string,
): Promise<{ contract: Awaited<ReturnType<typeof prisma.financingContract.findUnique>>; created: boolean }> {
  const existing = await prisma.financingContract.findUnique({
    where: { applicationId },
    include: { installments: { orderBy: { n: "asc" } } },
  });
  if (existing) return { contract: existing, created: false };

  const app = (await prisma.financingApplication.findUnique({
    where: { id: applicationId },
    include: { product: true },
  })) as (FinancingApplication & { product: FinancingProduct }) | null;
  if (!app) throw new Error("application_not_found");
  if (app.status !== "APPROVED") throw new Error("application_not_approved");

  const quote = computeQuote({
    amount: Number(app.amount),
    downPayment: Number(app.downPayment),
    termMonths: app.termMonths,
    rateBasis: app.product.rateBasis,
    ratePct: Number(app.product.ratePct),
    adminFeePct: Number(app.product.adminFeePct),
    adminFeeFlat: Number(app.product.adminFeeFlat),
    vatOnFees: app.product.vatOnFees,
  });

  const contract = await prisma.$transaction(async (tx) => {
    const c = await tx.financingContract.create({
      data: {
        code: code(),
        applicationId: app.id,
        clientId: app.clientId,
        applicantId: app.applicantId,
        productId: app.productId,
        status: "AWAITING_CLIENT_SIGNATURE",
        amount: quote.amount,
        downPayment: quote.downPayment,
        financedAmount: quote.financedAmount,
        termMonths: quote.termMonths,
        rateBasis: app.product.rateBasis,
        ratePct: Number(app.product.ratePct),
        installmentAmount: quote.installment,
        totalInterest: quote.totalInterest,
        totalFees: quote.totalFees,
        totalVat: quote.totalVat,
        totalPayable: quote.totalPayable,
        aprPct: quote.aprPct,
        firstDueDate: quote.firstDueDate ? new Date(quote.firstDueDate) : null,
        lastDueDate: quote.lastDueDate ? new Date(quote.lastDueDate) : null,
        scheduleSnapshot: quote as never,
        termsSnapshot: {
          productCode: app.product.code,
          productName: app.product.nameAr,
          policyVersion: app.product.policyVersion,
          gracePeriodDays: app.product.gracePeriodDays,
          earlySettlementNote: app.product.earlySettlementNote,
          latePaymentNote: app.product.latePaymentNote,
        } as never,
      },
    });

    if (quote.schedule.length) {
      await tx.financingInstallment.createMany({
        data: quote.schedule.map((row) => ({
          contractId: c.id,
          n: row.n,
          dueDate: new Date(row.dueDate),
          principal: row.principal,
          interest: row.interest,
          fees: row.fees,
          total: row.total,
          balanceAfter: row.balance,
        })),
      });
    }

    return c;
  });

  await appendEvent({
    applicationId: app.id,
    type: "contract_generated",
    message: `تم إصدار العقد ${contract.code} بانتظار توقيع العميل.`,
    metadata: { contractId: contract.id },
  });
  await notifyApplicant(
    app.id,
    `📄 تم إصدار عقد التمويل ${contract.code}.\nيرجى الدخول إلى بوابتك لمراجعة الشروط وتوقيع العقد إلكترونياً.`,
  );

  const full = await prisma.financingContract.findUnique({
    where: { id: contract.id },
    include: { installments: { orderBy: { n: "asc" } } },
  });
  return { contract: full, created: true };
}

/** SHA-256 signature hash binding user + timestamp + IP + contract snapshot */
export function computeSignatureHash(input: {
  contractId: string;
  userId: string;
  fullName: string;
  ip?: string | null;
  when: Date;
  scheduleSnapshot: unknown;
}): string {
  const payload = JSON.stringify({
    c: input.contractId,
    u: input.userId,
    n: input.fullName,
    i: input.ip || "",
    t: input.when.toISOString(),
    s: input.scheduleSnapshot,
  });
  return createHash("sha256").update(payload).digest("hex");
}
