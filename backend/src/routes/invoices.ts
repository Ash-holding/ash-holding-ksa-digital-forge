import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";
import { WA } from "../lib/whatsapp.js";
import { activateRequestIfInvoicePaid } from "./projects.js";
import { awardCashback, ensureWallet } from "./wallet.js";

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
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
      where.clientId = cid;
    } else if (req.query.clientId) where.clientId = req.query.clientId as string;
    if (req.query.status) where.status = req.query.status as never;

    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { client: { include: { user: { select: { name: true, email: true } } } }, project: { select: { title: true } } },
        orderBy: { createdAt: "desc" }, skip, take,
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
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
    res.json({ invoice: inv });
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
    activateRequestIfInvoicePaid(inv.id).catch((e) => console.error("[activate-request]", e));
    res.json({ invoice: inv });
  } catch (e) { next(e); }
});

invoicesRouter.delete("/:id", requireStaff, async (req, res, next) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    await logAudit(req, "invoice.delete", "Invoice", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
