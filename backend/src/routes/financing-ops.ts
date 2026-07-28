// Phase 5 — Financing Operations: reminders, overdue marking, late fees, autopay
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { WA } from "../lib/whatsapp.js";
import { ensureWallet } from "./wallet.js";
import { appendEvent, notifyApplicant } from "../lib/financing/lifecycle.js";
import { logAudit } from "../lib/audit.js";

export const financingOpsRouter = Router();
export const financingOpsPublicRouter = Router();

const STAFF_ROLES = [
  "ADMIN", "SUPER_ADMIN", "CFO", "CREDIT_MANAGER",
  "FINAL_APPROVER", "CREDIT_COMMITTEE", "OPERATIONS",
] as const;

function fmtMoney(n: number | string | { toString(): string }) {
  const v = typeof n === "number" ? n : Number(n?.toString() ?? 0);
  return v.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long", day: "numeric" }).format(d);
}
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

async function loadSettings() {
  const s = await prisma.financingSetting.upsert({
    where: { id: "default" }, update: {}, create: { id: "default" },
  });
  return s;
}

async function contractApplicantPhone(applicationId: string): Promise<string | null> {
  const app = await prisma.financingApplication.findUnique({
    where: { id: applicationId },
    include: {
      applicant: { select: { phone: true } },
      client: { include: { user: { select: { phone: true } } } },
    },
  });
  return app?.applicant?.phone || app?.client?.phone || app?.client?.user?.phone || null;
}

// ============================================================
// CORE OPS (importable for admin trigger + public cron)
// ============================================================

export async function runReminders() {
  const s = await loadSettings();
  const today = startOfDay();
  const target = addDays(today, s.reminderDaysBefore);
  const rangeEnd = addDays(target, 1);

  const due = await prisma.financingInstallment.findMany({
    where: {
      status: "PENDING",
      dueDate: { gte: target, lt: rangeEnd },
      remindersSent: 0,
      contract: { status: "ACTIVE" },
    },
    include: { contract: { select: { id: true, code: true, applicationId: true, autopayEnabled: true } } },
    take: 200,
  });

  let sent = 0;
  for (const inst of due) {
    const phone = await contractApplicantPhone(inst.contract.applicationId);
    const msg = [
      `🔔 *تذكير بموعد قسط تمويل*`,
      `━━━━━━━━━━━━━━`,
      `العقد: *${inst.contract.code}*`,
      `القسط رقم: *${inst.n}*`,
      `المبلغ: *${fmtMoney(inst.total)} ر.س*`,
      `تاريخ الاستحقاق: *${fmtDate(inst.dueDate)}*`,
      inst.contract.autopayEnabled
        ? `\n💳 السداد التلقائي مفعّل — سيتم خصم القسط من محفظتك تلقائياً.`
        : `\nيرجى التأكد من توفر الرصيد قبل تاريخ الاستحقاق.`,
      `━━━━━━━━━━━━━━`,
      `ASH HOLDING — إدارة التمويل`,
    ].join("\n");
    if (phone) WA.notify(phone, msg, { kind: "financing.reminder" });
    await prisma.financingInstallment.update({
      where: { id: inst.id },
      data: { remindersSent: { increment: 1 }, lastReminderAt: new Date() },
    });
    sent++;
  }
  return { sent, scanned: due.length };
}

export async function runOverdueMarker() {
  const s = await loadSettings();
  const cutoff = addDays(startOfDay(), -s.gracePeriodDays);

  const overdue = await prisma.financingInstallment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: cutoff },
      contract: { status: { in: ["ACTIVE", "DEFAULTED"] } },
    },
    include: { contract: { select: { id: true, code: true, applicationId: true, status: true } } },
    take: 500,
  });

  let marked = 0;
  let feesApplied = 0;
  const penaltyPct = Number(s.latePenaltyPct);
  const capPct = Number(s.latePenaltyCapPct);

  for (const inst of overdue) {
    const base = Number(inst.total);
    const cap = +(base * capPct / 100).toFixed(2);
    const already = Number(inst.penaltyAmount);
    const newFee = Math.max(0, Math.min(cap - already, +(base * penaltyPct / 100).toFixed(2)));

    await prisma.financingInstallment.update({
      where: { id: inst.id },
      data: {
        status: "OVERDUE",
        penaltyAmount: { increment: newFee },
      },
    });
    marked++;
    if (newFee > 0) feesApplied++;

    // Mark contract DEFAULTED if 3+ consecutive overdue installments
    const overdueCount = await prisma.financingInstallment.count({
      where: { contractId: inst.contract.id, status: "OVERDUE" },
    });
    if (overdueCount >= 3 && inst.contract.status === "ACTIVE") {
      await prisma.financingContract.update({
        where: { id: inst.contract.id },
        data: { status: "DEFAULTED" },
      });
      await appendEvent({
        applicationId: inst.contract.applicationId,
        type: "contract_defaulted",
        message: `تم تصنيف العقد كمتعثر بعد ${overdueCount} أقساط متأخرة`,
      });
    }

    const phone = await contractApplicantPhone(inst.contract.applicationId);
    const msg = [
      `⚠️ *تنبيه تأخر قسط*`,
      `━━━━━━━━━━━━━━`,
      `العقد: *${inst.contract.code}*`,
      `القسط رقم: ${inst.n} — تاريخ الاستحقاق: ${fmtDate(inst.dueDate)}`,
      `المبلغ الأصلي: ${fmtMoney(base)} ر.س`,
      newFee > 0 ? `غرامة تأخير: *${fmtMoney(newFee)} ر.س*` : ``,
      `\nيرجى السداد في أقرب وقت لتجنّب رسوم إضافية وتأثير على سجلك الائتماني.`,
      `━━━━━━━━━━━━━━`,
      `ASH HOLDING — إدارة التمويل`,
    ].filter(Boolean).join("\n");
    if (phone) WA.notify(phone, msg, { kind: "financing.overdue" });
  }
  return { marked, feesApplied };
}

export async function runAutopay() {
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  const dueToday = await prisma.financingInstallment.findMany({
    where: {
      status: { in: ["PENDING", "OVERDUE"] },
      dueDate: { lt: tomorrow },
      contract: { status: "ACTIVE", autopayEnabled: true },
    },
    include: {
      contract: {
        select: {
          id: true, code: true, applicationId: true, clientId: true, autopayFailures: true,
        },
      },
    },
    take: 300,
  });

  let paid = 0, skipped = 0, failed = 0;
  for (const inst of dueToday) {
    const cid = inst.contract.clientId;
    if (!cid) { skipped++; continue; }
    const owed = Number(inst.total) + Number(inst.penaltyAmount);
    const wallet = await ensureWallet(cid);
    if (Number(wallet.balance) < owed) {
      await prisma.financingContract.update({
        where: { id: inst.contract.id }, data: { autopayFailures: { increment: 1 } },
      });
      failed++;
      const phone = await contractApplicantPhone(inst.contract.applicationId);
      if (phone) WA.notify(phone,
        `❗ تعذر السداد التلقائي لقسط تمويل *${inst.contract.code}* رقم ${inst.n} — الرصيد غير كافٍ (المطلوب ${fmtMoney(owed)} ر.س). يرجى شحن المحفظة أو السداد يدوياً.`,
        { kind: "financing.autopay.failed" });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: owed } },
      });
      const txRow = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "FINANCING_INSTALLMENT",
          status: "APPROVED",
          amount: owed,
          balanceAfter: w.balance,
          approvedAt: new Date(),
          note: `سداد تلقائي — عقد ${inst.contract.code} قسط ${inst.n}`,
        },
      });
      await tx.financingInstallment.update({
        where: { id: inst.id },
        data: {
          status: "PAID", paidAt: new Date(), paidAmount: owed, paidTxId: txRow.id,
          note: `AUTOPAY`,
        },
      });
      await tx.financingContract.update({
        where: { id: inst.contract.id },
        data: { autopayFailures: 0 },
      });
    });

    const remaining = await prisma.financingInstallment.count({
      where: { contractId: inst.contract.id, status: { not: "PAID" } },
    });
    if (remaining === 0) {
      await prisma.financingContract.update({
        where: { id: inst.contract.id }, data: { status: "COMPLETED" },
      });
      await notifyApplicant(inst.contract.applicationId,
        `🎉 تم سداد جميع أقساط عقد التمويل *${inst.contract.code}* بالكامل. شكراً لثقتكم.`,
      );
    } else {
      const phone = await contractApplicantPhone(inst.contract.applicationId);
      if (phone) WA.notify(phone,
        `✅ تم خصم القسط رقم ${inst.n} من عقد *${inst.contract.code}* بمبلغ *${fmtMoney(owed)} ر.س* من محفظتك تلقائياً.`,
        { kind: "financing.autopay.success" });
    }

    await appendEvent({
      applicationId: inst.contract.applicationId,
      type: "installment_autopaid",
      message: `سداد تلقائي للقسط ${inst.n} — ${fmtMoney(owed)} ر.س`,
    });
    paid++;
  }
  return { paid, failed, skipped };
}

// ============================================================
// PUBLIC CRON (secured by CRON_SECRET)
// ============================================================

function checkCronSecret(req: any): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers["x-cron-secret"] || req.query.secret;
  return provided === secret;
}

financingOpsPublicRouter.post("/cron/run", async (req, res, next) => {
  try {
    if (!checkCronSecret(req)) return res.status(401).json({ error: "unauthorized" });
    const [reminders, overdue, autopay] = await Promise.all([
      runReminders(), runOverdueMarker(), runAutopay(),
    ]);
    res.json({ ok: true, at: new Date().toISOString(), reminders, overdue, autopay });
  } catch (e) { next(e); }
});

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

financingOpsRouter.use(requireAuth);

financingOpsRouter.post(
  "/admin/ops/run/:job",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (req, res, next) => {
    try {
      const job = req.params.job;
      let result: unknown;
      if (job === "reminders") result = await runReminders();
      else if (job === "overdue") result = await runOverdueMarker();
      else if (job === "autopay") result = await runAutopay();
      else if (job === "all") result = {
        reminders: await runReminders(),
        overdue: await runOverdueMarker(),
        autopay: await runAutopay(),
      };
      else return res.status(400).json({ error: "unknown_job" });
      await logAudit(req, "financing.ops.run", "FinancingOps", job, result as any);
      res.json({ ok: true, job, result });
    } catch (e) { next(e); }
  },
);

// Settings: read + update (ADMIN + CFO)
financingOpsRouter.get(
  "/admin/settings/ops",
  requireRole(...(STAFF_ROLES as unknown as [string, ...string[]])),
  async (_req, res, next) => {
    try { res.json(await loadSettings()); } catch (e) { next(e); }
  },
);

const opsSettingsSchema = z.object({
  reminderDaysBefore: z.number().int().min(0).max(30).optional(),
  gracePeriodDays: z.number().int().min(0).max(30).optional(),
  latePenaltyPct: z.number().min(0).max(10).optional(),
  latePenaltyCapPct: z.number().min(0).max(30).optional(),
  autopayDefaultOn: z.boolean().optional(),
});

financingOpsRouter.patch(
  "/admin/settings/ops",
  requireRole("ADMIN", "SUPER_ADMIN", "CFO"),
  async (req, res, next) => {
    try {
      const p = opsSettingsSchema.safeParse(req.body);
      if (!p.success) return res.status(400).json({ error: "invalid_input" });
      const updated = await prisma.financingSetting.update({
        where: { id: "default" }, data: p.data,
      });
      await logAudit(req, "financing.settings.ops.update", "FinancingSetting", "default", p.data);
      res.json(updated);
    } catch (e) { next(e); }
  },
);

// Autopay toggle — client or admin
financingOpsRouter.patch("/contracts/:id/autopay", async (req, res, next) => {
  try {
    const parsed = z.object({ enabled: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
    const c = await prisma.financingContract.findUnique({
      where: { id: req.params.id },
      select: { id: true, code: true, applicantId: true, applicationId: true, status: true },
    });
    if (!c) return res.status(404).json({ error: "not_found" });
    const staff = (STAFF_ROLES as readonly string[]).includes(req.user!.role);
    if (!staff && c.applicantId !== req.user!.sub) return res.status(403).json({ error: "forbidden" });

    const updated = await prisma.financingContract.update({
      where: { id: c.id }, data: { autopayEnabled: parsed.data.enabled },
    });
    await appendEvent({
      applicationId: c.applicationId,
      actorId: req.user!.sub,
      type: "autopay_toggled",
      message: `تم ${parsed.data.enabled ? "تفعيل" : "إيقاف"} السداد التلقائي للعقد ${c.code}`,
    });
    res.json({ ok: true, autopayEnabled: updated.autopayEnabled });
  } catch (e) { next(e); }
});

// Waive a late fee on an installment (admin)
financingOpsRouter.post(
  "/admin/installments/:id/waive-penalty",
  requireRole("ADMIN", "SUPER_ADMIN", "CFO", "CREDIT_MANAGER"),
  async (req, res, next) => {
    try {
      const reason = z.object({ reasonAr: z.string().min(3).max(500) }).safeParse(req.body);
      if (!reason.success) return res.status(400).json({ error: "invalid_input" });
      const inst = await prisma.financingInstallment.findUnique({
        where: { id: req.params.id },
        include: { contract: { select: { code: true, applicationId: true } } },
      });
      if (!inst) return res.status(404).json({ error: "not_found" });
      const waived = Number(inst.penaltyAmount);
      await prisma.financingInstallment.update({
        where: { id: inst.id },
        data: { penaltyAmount: 0, note: `WAIVED: ${reason.data.reasonAr}` },
      });
      await appendEvent({
        applicationId: inst.contract.applicationId,
        actorId: req.user!.sub,
        type: "penalty_waived",
        message: `إعفاء غرامة القسط ${inst.n} من عقد ${inst.contract.code} (${fmtMoney(waived)} ر.س) — ${reason.data.reasonAr}`,
      });
      await logAudit(req, "financing.penalty.waive", "FinancingInstallment", inst.id, reason.data);
      res.json({ ok: true, waived });
    } catch (e) { next(e); }
  },
);
