import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";
import { WA } from "../lib/whatsapp.js";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

const PAYMENT_METHODS = ["BANK_TRANSFER", "PAYLINK", "CASH", "MANUAL"] as const;
const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;

const paymentSchema = z.object({
  clientId: z.string(),
  invoiceId: z.string().optional().nullable(),
  amount: z.number().positive(),
  currency: z.string().optional(),
  method: z.enum(PAYMENT_METHODS),
  transactionRef: z.string().optional().nullable(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  paidAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

paymentsRouter.get("/", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    let where: import("@prisma/client").Prisma.PaymentWhereInput = {};
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
      where.clientId = cid;
    } else if (req.query.clientId) where.clientId = req.query.clientId as string;
    if (req.query.status) where.status = req.query.status as never;
    if (req.query.method) where.method = req.query.method as never;

    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { client: { include: { user: { select: { name: true } } } }, invoice: { select: { invoiceNumber: true } } },
        orderBy: { createdAt: "desc" }, skip, take,
      }),
      prisma.payment.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});

paymentsRouter.get("/:id", async (req, res, next) => {
  try {
    const p = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        client: { include: { user: { select: { name: true, email: true, phone: true } } } },
        invoice: { select: { id: true, invoiceNumber: true, total: true, status: true } },
      },
    });
    if (!p) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (p.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ payment: p });
  } catch (e) { next(e); }
});

paymentsRouter.post("/", requireStaff, async (req, res, next) => {
  try {
    const data = paymentSchema.parse(req.body);
    if (data.status === "SUCCESS" && !data.paidAt) data.paidAt = new Date();
    const created = await prisma.payment.create({ data: data as never });
    await logAudit(req, "payment.create", "Payment", created.id);
    if (created.status === "SUCCESS") {
      const c = await prisma.client.findUnique({
        where: { id: created.clientId },
        include: { user: { select: { phone: true } } },
      });
      const phone = c?.phone || c?.user?.phone || null;
      WA.notify(
        phone,
        `ASH HOLDING — تم تسجيل دفعة ✅\nالمبلغ: ${created.amount} ${created.currency}\nطريقة الدفع: ${created.method}`,
        { kind: "payment.create", entityId: created.id },
      );
    }
    res.status(201).json({ payment: created });
  } catch (e) { next(e); }
});

paymentsRouter.patch("/:id", requireStaff, async (req, res, next) => {
  try {
    const data = paymentSchema.partial().parse(req.body);
    if (data.status === "SUCCESS" && !data.paidAt) data.paidAt = new Date();
    const updated = await prisma.payment.update({ where: { id: req.params.id }, data: data as never });
    await logAudit(req, "payment.update", "Payment", updated.id);
    res.json({ payment: updated });
  } catch (e) { next(e); }
});

paymentsRouter.delete("/:id", requireStaff, async (req, res, next) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.id } });
    await logAudit(req, "payment.delete", "Payment", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
