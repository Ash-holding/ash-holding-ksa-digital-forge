// Phase 4 — Financing Contract lifecycle:
// generate (admin) → client sign → activate (admin, credits wallet) → installments
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ensureWallet } from "./wallet.js";
import { WA } from "../lib/whatsapp.js";
import { logAudit } from "../lib/audit.js";
import { generateContractForApplication, computeSignatureHash } from "../lib/financing/contract.js";
import { appendEvent, notifyApplicant, bankMessage } from "../lib/financing/lifecycle.js";
import type { Prisma } from "@prisma/client";

export const financingContractsRouter = Router();
financingContractsRouter.use(requireAuth);

const STAFF_ROLES = [
  "ADMIN", "SUPER_ADMIN", "CFO", "CREDIT_MANAGER",
  "FINAL_APPROVER", "CREDIT_COMMITTEE", "OPERATIONS",
] as const;

function fmtMoney(n: number | string | { toString(): string }) {
  const v = typeof n === "number" ? n : Number(n?.toString() ?? 0);
  return v.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadContract(id: string) {
  return prisma.financingContract.findUnique({
    where: { id },
    include: {
      installments: { orderBy: { n: "asc" } },
      application: { select: { id: true, code: true, applicantId: true, clientId: true, fullNameAr: true, nationalId: true, businessName: true } },
      product: { select: { id: true, code: true, nameAr: true } },
    },
  });
}

function canReadContract(userRole: string, userId: string, contract: { applicantId: string }) {
  if ((STAFF_ROLES as readonly string[]).includes(userRole)) return true;
  return contract.applicantId === userId;
}

// ============= GENERATE (admin) =============
financingContractsRouter.post(
  "/applications/:appId/contract",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const { contract, created } = await generateContractForApplication(req.params.appId);
      await logAudit(req, "financing.contract.generate", "FinancingContract", contract!.id, { created });
      res.json({ contract, created });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "error";
      if (msg === "application_not_approved") return res.status(400).json({ error: msg });
      if (msg === "application_not_found") return res.status(404).json({ error: msg });
      next(e);
    }
  },
);

// ============= READ =============
financingContractsRouter.get("/contracts/:id", async (req, res, next) => {
  try {
    const c = await loadContract(req.params.id);
    if (!c) return res.status(404).json({ error: "not_found" });
    if (!canReadContract(req.user!.role, req.user!.sub, c)) return res.status(403).json({ error: "forbidden" });
    res.json(c);
  } catch (e) { next(e); }
});

financingContractsRouter.get("/mine", async (req, res, next) => {
  try {
    const rows = await prisma.financingContract.findMany({
      where: { applicantId: req.user!.sub },
      include: { product: { select: { nameAr: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ rows });
  } catch (e) { next(e); }
});

// Admin list
financingContractsRouter.get(
  "/admin/contracts",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const status = req.query.status as string | undefined;
      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      const rows = await prisma.financingContract.findMany({
        where,
        include: {
          product: { select: { nameAr: true } },
          application: { select: { code: true, fullNameAr: true, businessName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      res.json({ rows });
    } catch (e) { next(e); }
  },
);

// ============= CLIENT SIGN =============
const signSchema = z.object({
  fullName: z.string().min(3).max(120),
  acceptTerms: z.literal(true),
  acceptSchedule: z.literal(true),
  acceptDisclosure: z.literal(true),
});

financingContractsRouter.post("/contracts/:id/sign", async (req, res, next) => {
  try {
    const parsed = signSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });

    const c = await prisma.financingContract.findUnique({ where: { id: req.params.id } });
    if (!c) return res.status(404).json({ error: "not_found" });
    if (c.applicantId !== req.user!.sub) return res.status(403).json({ error: "forbidden" });
    if (c.status !== "AWAITING_CLIENT_SIGNATURE") return res.status(400).json({ error: "not_signable", status: c.status });

    const when = new Date();
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
    const hash = computeSignatureHash({
      contractId: c.id,
      userId: req.user!.sub,
      fullName: parsed.data.fullName,
      ip,
      when,
      scheduleSnapshot: c.scheduleSnapshot,
    });

    const updated = await prisma.financingContract.update({
      where: { id: c.id },
      data: {
        status: "SIGNED",
        clientSignedAt: when,
        clientSignatureIp: ip,
        clientSignatureHash: hash,
        clientSignatureName: parsed.data.fullName,
      },
    });

    await appendEvent({
      applicationId: c.applicationId,
      actorId: req.user!.sub,
      type: "contract_signed",
      message: `تم توقيع العقد ${c.code} إلكترونياً.`,
      metadata: { contractId: c.id, hash: hash.slice(0, 12) },
    });
    await logAudit(req, "financing.contract.sign", "FinancingContract", c.id, { hash: hash.slice(0, 12) });

    // Notify staff via WA (best-effort)
    WA.notify(
      process.env.ADMIN_WHATSAPP || null,
      `✍️ تم توقيع عقد التمويل *${c.code}* من قبل العميل.\nبانتظار التفعيل وصرف الرصيد.`,
      { kind: "financing.contract.signed" },
    );

    res.json(updated);
  } catch (e) { next(e); }
});

// ============= ACTIVATE (admin → wallet disburse) =============
financingContractsRouter.post(
  "/admin/contracts/:id/activate",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const c = await prisma.financingContract.findUnique({ where: { id: req.params.id } });
      if (!c) return res.status(404).json({ error: "not_found" });
      if (c.status !== "SIGNED") return res.status(400).json({ error: "not_signed", status: c.status });
      if (!c.clientId) return res.status(400).json({ error: "no_client_profile" });

      // Ensure production is enabled
      const settings = await prisma.financingSetting.findUnique({ where: { id: "default" } });
      if (!settings?.productionEnabled) {
        return res.status(423).json({ error: "financing_sandbox_locked", message: "التفعيل يتطلب تشغيل بيئة الإنتاج." });
      }

      const wallet = await ensureWallet(c.clientId);
      const disburseAmount = Number(c.financedAmount);

      const result = await prisma.$transaction(async (tx) => {
        const w = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: disburseAmount } },
        });
        const twx = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "FINANCING_DISBURSE",
            status: "APPROVED",
            amount: disburseAmount,
            balanceAfter: w.balance,
            reference: c.code,
            approvedById: req.user!.sub,
            approvedAt: new Date(),
            note: `صرف رصيد خدمات — عقد التمويل ${c.code}`,
          },
        });
        const uc = await tx.financingContract.update({
          where: { id: c.id },
          data: {
            status: "ACTIVE",
            activatedAt: new Date(),
            activatedById: req.user!.sub,
            disbursedTxId: twx.id,
          },
        });
        return { contract: uc, tx: twx, walletBalance: w.balance };
      });

      await appendEvent({
        applicationId: c.applicationId,
        actorId: req.user!.sub,
        type: "contract_activated",
        message: `تم تفعيل العقد ${c.code} وإيداع ${fmtMoney(disburseAmount)} ر.س رصيد خدمات في المحفظة.`,
        metadata: { contractId: c.id, txId: result.tx.id },
      });
      await notifyApplicant(
        c.applicationId,
        [
          `✅ تم تفعيل عقد التمويل *${c.code}*`,
          `تم إيداع *${fmtMoney(disburseAmount)} ر.س* رصيد خدمات في محفظتك.`,
          `يمكنك الآن استخدامه لسداد أي فاتورة خدمات من ASH HOLDING.`,
        ].join("\n"),
      );
      await logAudit(req, "financing.contract.activate", "FinancingContract", c.id, { txId: result.tx.id });

      res.json(result);
    } catch (e) { next(e); }
  },
);

// ============= CANCEL (admin) =============
financingContractsRouter.post(
  "/admin/contracts/:id/cancel",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const reason = z.object({ reasonAr: z.string().min(3).max(500) }).safeParse(req.body);
      if (!reason.success) return res.status(400).json({ error: "invalid_input" });
      const c = await prisma.financingContract.findUnique({ where: { id: req.params.id } });
      if (!c) return res.status(404).json({ error: "not_found" });
      if (["ACTIVE", "COMPLETED"].includes(c.status)) return res.status(400).json({ error: "cannot_cancel_active" });
      const uc = await prisma.financingContract.update({
        where: { id: c.id },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReasonAr: reason.data.reasonAr },
      });
      await appendEvent({
        applicationId: c.applicationId,
        actorId: req.user!.sub,
        type: "contract_cancelled",
        message: `تم إلغاء العقد ${c.code}: ${reason.data.reasonAr}`,
      });
      await logAudit(req, "financing.contract.cancel", "FinancingContract", c.id, reason.data);
      res.json(uc);
    } catch (e) { next(e); }
  },
);

// ============= INSTALLMENT MARK-PAID (admin) =============
const payInstallSchema = z.object({
  paidAmount: z.number().positive().optional(),
  source: z.enum(["WALLET", "BANK", "CASH", "OTHER"]).default("BANK"),
  reference: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
});

financingContractsRouter.post(
  "/admin/contracts/:id/installments/:n/pay",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const parsed = payInstallSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
      const c = await prisma.financingContract.findUnique({ where: { id: req.params.id } });
      if (!c) return res.status(404).json({ error: "not_found" });
      if (!["ACTIVE", "DEFAULTED"].includes(c.status)) return res.status(400).json({ error: "not_active" });
      const n = Number(req.params.n);
      const inst = await prisma.financingInstallment.findUnique({
        where: { contractId_n: { contractId: c.id, n } },
      });
      if (!inst) return res.status(404).json({ error: "installment_not_found" });
      if (inst.status === "PAID") return res.status(400).json({ error: "already_paid" });

      const paid = parsed.data.paidAmount ?? Number(inst.total);
      const updated = await prisma.financingInstallment.update({
        where: { id: inst.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paidAmount: paid,
          note: parsed.data.note ?? `${parsed.data.source}${parsed.data.reference ? " — " + parsed.data.reference : ""}`,
        },
      });

      // Auto-complete contract if all paid
      const remaining = await prisma.financingInstallment.count({
        where: { contractId: c.id, status: { not: "PAID" } },
      });
      if (remaining === 0) {
        await prisma.financingContract.update({
          where: { id: c.id },
          data: { status: "COMPLETED" },
        });
        await notifyApplicant(c.applicationId,
          `🎉 تم سداد جميع أقساط عقد التمويل *${c.code}* بالكامل. شكراً لثقتكم.`,
        );
      } else {
        await notifyApplicant(c.applicationId,
          `💳 تم استلام سداد القسط رقم ${n} من عقد التمويل ${c.code} بمبلغ *${fmtMoney(paid)} ر.س*.`,
        );
      }

      await appendEvent({
        applicationId: c.applicationId,
        actorId: req.user!.sub,
        type: "installment_paid",
        message: `سداد القسط ${n} — ${fmtMoney(paid)} ر.س`,
        metadata: { installmentId: inst.id, source: parsed.data.source },
      });
      await logAudit(req, "financing.installment.pay", "FinancingInstallment", inst.id, parsed.data);

      res.json(updated);
    } catch (e) { next(e); }
  },
);
