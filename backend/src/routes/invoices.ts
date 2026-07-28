import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";
import { WA } from "../lib/whatsapp.js";
import { activateRequestIfInvoicePaid, ensureInvoiceForSignedRequest } from "./projects.js";
import { awardCashback, ensureWallet } from "./wallet.js";
import { generateCommissionForPayment } from "../lib/commission.js";

async function clientPhone(clientId: string): Promise<string | null> {
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: { select: { phone: true, name: true } } },
  });
  return c?.phone || c?.user?.phone || null;
}

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

const INVOICE_STATUSES = ["DRAFT", "UNPAID", "PAID", "OVERDUE", "CANCELLED"] as const;

const itemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const invoiceSchema = z.object({
  clientId: z.string(),
  projectId: z.string().optional().nullable(),
  discount: z.number().nonnegative().default(0),
  taxRate: z.number().min(0).max(100).default(15),
  dueAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

async function nextInvoiceNumber(): Promise<string> {
  const y = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { invoiceNumber: { startsWith: `INV-${y}-` } } });
  return `INV-${y}-${String(count + 1).padStart(4, "0")}`;
}

function computeTotals(items: { quantity: number; unitPrice: number }[], discount: number, taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = +(taxable * (taxRate / 100)).toFixed(2);
  const total = +(taxable + taxAmount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), taxAmount, total };
}

invoicesRouter.get("/", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    let where: import("@prisma/client").Prisma.InvoiceWhereInput = {};
    let scopedClientId: string | null = null;
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
      where.clientId = cid;
      scopedClientId = cid;
    } else if (req.query.clientId) {
      where.clientId = req.query.clientId as string;
      scopedClientId = req.query.clientId as string;
    }
    if (req.query.status) where.status = req.query.status as never;

    // Auto-heal: backfill invoices for any signed request without a linked invoice.
    if (scopedClientId) {
      const orphan = await prisma.projectRequest.findMany({
        where: { clientId: scopedClientId, status: { in: ["SIGNED", "IN_PROGRESS", "DELIVERED", "COMPLETED"] as never }, linkedInvoiceId: null, proposalAmount: { not: null } },
        select: { id: true },
        take: 20,
      });
      for (const o of orphan) {
        try { await ensureInvoiceForSignedRequest(o.id); } catch (e) { console.error("[invoices.backfill]", e); }
      }
    }

    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          client: { include: { user: { select: { name: true, email: true, phone: true } } } },
          project: { select: { id: true, title: true, status: true } },
          payments: { select: { id: true, status: true, amount: true, method: true, paidAt: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" }, skip, take,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Attach linkedRequest + contract + service in one round-trip each
    const invIds = rows.map(r => r.id);
    const projIds = Array.from(new Set(rows.map(r => r.projectId).filter(Boolean) as string[]));
    const [requests, contracts, services] = await Promise.all([
      invIds.length
        ? prisma.projectRequest.findMany({
            where: { linkedInvoiceId: { in: invIds } },
            select: { id: true, title: true, category: true, status: true, linkedInvoiceId: true },
          })
        : Promise.resolve([]),
      projIds.length
        ? prisma.contract.findMany({
            where: { projectId: { in: projIds } },
            select: { id: true, contractNumber: true, title: true, status: true, projectId: true },
          })
        : Promise.resolve([]),
      projIds.length
        ? prisma.clientService.findMany({
            where: { projectId: { in: projIds } },
            select: { id: true, name: true, type: true, status: true, projectId: true },
          })
        : Promise.resolve([]),
    ]);
    const reqByInv = new Map(requests.map(r => [r.linkedInvoiceId!, r]));
    const contractByProj = new Map(contracts.map(c => [c.projectId!, c]));
    const serviceByProj = new Map(services.map(s => [s.projectId!, s]));
    const enriched = rows.map(r => {
      const lr = reqByInv.get(r.id) || null;
      return {
        ...r,
        linkedRequest: lr,
        requestRef: lr ? `REQ-${lr.id.replace(/-/g, "").slice(0, 6).toUpperCase()}` : null,
        contract: r.projectId ? contractByProj.get(r.projectId) ?? null : null,
        service: r.projectId ? serviceByProj.get(r.projectId) ?? null : null,
      };
    });

    // Admin-only aggregate stats across the full scope (not just current page)
    let stats: Record<string, number> | undefined;
    if (isStaff(req)) {
      const grouped = await prisma.invoice.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { total: true },
      });
      const now = new Date();
      const overdueAgg = await prisma.invoice.aggregate({
        where: { ...where, status: { notIn: ["PAID", "CANCELLED"] as never }, dueAt: { lt: now } },
        _count: { _all: true },
        _sum: { total: true },
      });
      const get = (s: string) => grouped.find(g => g.status === s);
      stats = {
        total: grouped.reduce((s, g) => s + g._count._all, 0),
        paid:   get("PAID")?._count._all ?? 0,
        unpaid: (get("UNPAID")?._count._all ?? 0) + (get("DRAFT")?._count._all ?? 0),
        overdue: overdueAgg._count._all ?? 0,
        paidAmount:    Number(get("PAID")?._sum.total ?? 0),
        unpaidAmount:  Number(get("UNPAID")?._sum.total ?? 0) + Number(get("DRAFT")?._sum.total ?? 0),
        overdueAmount: Number(overdueAgg._sum.total ?? 0),
      };
    }
    res.json({ rows: enriched, total, page, pageSize, stats });
  } catch (e) { next(e); }
});


invoicesRouter.get("/:id", async (req, res, next) => {
  try {
    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        items: true, payments: true,
        client: { include: { user: { select: { name: true, email: true, phone: true } } } },
        project: { select: { id: true, title: true } },
      },
    });
    if (!inv) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (inv.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
    }
    // Attach linked project request info (for PDF/reference)
    const linkedRequest = await prisma.projectRequest.findFirst({
      where: { linkedInvoiceId: inv.id },
      select: { id: true, title: true, category: true, proposalScope: true, proposalDuration: true },
    });
    const requestRef = linkedRequest
      ? `REQ-${linkedRequest.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`
      : null;
    // Attach wallet transactions linked to this invoice (payment, cashback, refunds…)
    const walletTransactions = await prisma.walletTransaction.findMany({
      where: { invoiceId: inv.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ invoice: { ...inv, linkedRequest, requestRef, walletTransactions } });
  } catch (e) { next(e); }
});


invoicesRouter.post("/", requireStaff, async (req, res, next) => {
  try {
    const data = invoiceSchema.parse(req.body);
    const totals = computeTotals(data.items, data.discount, data.taxRate);
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(),
        clientId: data.clientId,
        projectId: data.projectId || null,
        discount: data.discount, taxRate: data.taxRate,
        subtotal: totals.subtotal, taxAmount: totals.taxAmount, total: totals.total,
        dueAt: data.dueAt || null, notes: data.notes || null,
        items: { create: data.items.map((i) => ({ ...i, total: +(i.quantity * i.unitPrice).toFixed(2) })) },
      },
      include: { items: true },
    });
    await logAudit(req, "invoice.create", "Invoice", invoice.id);
    const phone = await clientPhone(data.clientId);
    WA.notify(
      phone,
      `ASH HOLDING — فاتورة جديدة\nرقم: ${invoice.invoiceNumber}\nالإجمالي: ${invoice.total} ${invoice.currency}\n${data.dueAt ? `تاريخ الاستحقاق: ${new Date(data.dueAt).toLocaleDateString("ar-SA")}\n` : ""}اطلع عليها من بوابة العميل.`,
      { kind: "invoice.create", entityId: invoice.id },
    );
    res.status(201).json({ invoice });
  } catch (e) { next(e); }
});

invoicesRouter.patch("/:id", requireStaff, async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(INVOICE_STATUSES).optional(),
      notes: z.string().optional().nullable(),
      dueAt: z.coerce.date().optional().nullable(),
      paidAt: z.coerce.date().optional().nullable(),
    }).parse(req.body);
    if (body.status === "PAID" && !body.paidAt) body.paidAt = new Date();
    const updated = await prisma.invoice.update({ where: { id: req.params.id }, data: body });
    await logAudit(req, "invoice.update", "Invoice", updated.id, body as never);
    if (body.status === "PAID") {
      activateRequestIfInvoicePaid(updated.id).catch((e) => console.error("[activate-request]", e));
      awardCashback(updated.clientId, updated.id, Number(updated.total)).catch((e) => console.error("[cashback]", e));
    }
    res.json({ invoice: updated });
  } catch (e) { next(e); }
});

invoicesRouter.post("/:id/mark-paid", requireStaff, async (req, res, next) => {
  try {
    const inv = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    await logAudit(req, "invoice.mark_paid", "Invoice", inv.id);
    const phone = await clientPhone(inv.clientId);
    WA.notify(
      phone,
      `ASH HOLDING — تم استلام الدفع ✅\nفاتورة: ${inv.invoiceNumber}\nالمبلغ: ${inv.total} ${inv.currency}\nشكراً لتعاملكم معنا.`,
      { kind: "invoice.paid", entityId: inv.id },
    );
    awardCashback(inv.clientId, inv.id, Number(inv.total)).catch((e) => console.error("[cashback]", e));
    activateRequestIfInvoicePaid(inv.id).catch((e) => console.error("[activate-request]", e));
    res.json({ invoice: inv });
  } catch (e) { next(e); }
});

/** Pay invoice using wallet balance (client) */
invoicesRouter.post("/:id/pay-wallet", async (req, res, next) => {
  try {
    const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!inv) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (inv.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
    }
    if (inv.status === "PAID") return res.status(400).json({ error: "الفاتورة مسددة" });

    const wallet = await ensureWallet(inv.clientId);
    const amount = Number(inv.total);
    if (Number(wallet.balance) < amount) return res.status(400).json({ error: "الرصيد غير كافٍ" });

    const result = await prisma.$transaction(async (db) => {
      const w = await db.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });
      const payment = await db.payment.create({
        data: {
          clientId: inv.clientId,
          invoiceId: inv.id,
          amount,
          currency: inv.currency,
          method: "WALLET",
          status: "SUCCESS",
          paidAt: new Date(),
          notes: `سُدد من المحفظة الرقمية`,
        },
      });
      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "PAYMENT",
          status: "APPROVED",
          amount: -amount,
          balanceAfter: w.balance,
          invoiceId: inv.id,
          paymentId: payment.id,
          approvedAt: new Date(),
          note: `سداد الفاتورة ${inv.invoiceNumber}`,
        },
      });
      const invoiceUpdated = await db.invoice.update({
        where: { id: inv.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      return { w, payment, invoiceUpdated };
    });

    await logAudit(req, "invoice.pay_wallet", "Invoice", inv.id);
    const phone = await clientPhone(inv.clientId);
    WA.notify(phone,
      [
        `🏦 *سداد فاتورة من المحفظة*`,
        `━━━━━━━━━━━━━━`,
        `فاتورة: ${inv.invoiceNumber}`,
        `المبلغ: ${amount.toLocaleString("ar-SA")} ر.س`,
        `الرصيد المتبقي: ${Number(result.w.balance).toLocaleString("ar-SA")} ر.س`,
      ].join("\n"),
      { kind: "invoice.pay_wallet", entityId: inv.id },
    );
    awardCashback(inv.clientId, inv.id, amount).catch((e) => console.error("[cashback]", e));
    activateRequestIfInvoicePaid(inv.id).catch((e) => console.error("[activate-request]", e));
    generateCommissionForPayment(result.payment.id).catch((e) => console.error("[commission]", e));
    res.json({ invoice: result.invoiceUpdated, payment: result.payment, wallet: result.w });
  } catch (e) { next(e); }
});

/** Client submits bank-transfer notification (creates PENDING payment) */
invoicesRouter.post("/:id/submit-bank-transfer", async (req, res, next) => {
  try {
    const body = z.object({
      bankRef: z.string().optional().nullable(),
      note: z.string().optional().nullable(),
    }).parse(req.body ?? {});
    const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!inv) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (inv.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
    }
    const payment = await prisma.payment.create({
      data: {
        clientId: inv.clientId,
        invoiceId: inv.id,
        amount: Number(inv.total),
        currency: inv.currency,
        method: "BANK_TRANSFER",
        status: "PENDING",
        transactionRef: body.bankRef || null,
        notes: body.note || "إشعار تحويل بنكي من العميل قيد التحقق",
      },
    });
    await logAudit(req, "invoice.bank_transfer.submit", "Invoice", inv.id);
    const phone = await clientPhone(inv.clientId);
    WA.notify(phone,
      [
        `🏦 *إشعار تحويل بنكي قيد المراجعة*`,
        `━━━━━━━━━━━━━━`,
        `فاتورة: ${inv.invoiceNumber}`,
        `المبلغ: ${Number(inv.total).toLocaleString("ar-SA")} ر.س`,
        body.bankRef ? `المرجع: ${body.bankRef}` : "",
        `سيتم تأكيد السداد فور التحقق من الحوالة.`,
      ].filter(Boolean).join("\n"),
      { kind: "invoice.bank_transfer", entityId: inv.id },
    );
    res.status(201).json({ payment });
  } catch (e) { next(e); }
});

invoicesRouter.delete("/:id", requireStaff, async (req, res, next) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    await logAudit(req, "invoice.delete", "Invoice", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
