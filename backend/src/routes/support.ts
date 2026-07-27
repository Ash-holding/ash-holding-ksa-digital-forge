import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";

export const supportRouter = Router();
supportRouter.use(requireAuth);

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "CLOSED"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const createSchema = z.object({
  subject: z.string().min(3),
  description: z.string().optional().nullable(),
  priority: z.enum(PRIORITIES).optional(),
  clientId: z.string().optional(), // required when staff creates on behalf of client
});

const updateSchema = z.object({
  subject: z.string().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedToId: z.string().optional().nullable(),
});

async function nextTicketNumber(): Promise<string> {
  const y = new Date().getFullYear();
  const count = await prisma.supportTicket.count({ where: { ticketNumber: { startsWith: `TKT-${y}-` } } });
  return `TKT-${y}-${String(count + 1).padStart(4, "0")}`;
}

supportRouter.get("/tickets", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    let where: import("@prisma/client").Prisma.SupportTicketWhereInput = {};
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
      where.clientId = cid;
    } else {
      if (req.query.clientId) where.clientId = req.query.clientId as string;
      if (req.query.assignedToId) where.assignedToId = req.query.assignedToId as string;
    }
    if (req.query.status) where.status = req.query.status as never;
    if (req.query.priority) where.priority = req.query.priority as never;

    const [rows, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          client: { include: { user: { select: { name: true, email: true } } } },
          agent: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" }, skip, take,
      }),
      prisma.supportTicket.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});

supportRouter.get("/tickets/:id", async (req, res, next) => {
  try {
    const t = await prisma.supportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        client: { include: { user: { select: { name: true, email: true } } } },
        agent: { select: { id: true, name: true } },
        messages: { include: { sender: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
        files: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!t) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (t.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
      t.messages = t.messages.filter((m) => !m.isInternal);
    }
    res.json({ ticket: t });
  } catch (e) { next(e); }
});

supportRouter.post("/tickets", async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    let clientId = data.clientId;
    if (!isStaff(req)) {
      clientId = (await currentClientId(req)) || undefined;
      if (!clientId) return res.status(400).json({ error: "لا يوجد ملف عميل" });
    } else if (!clientId) {
      return res.status(400).json({ error: "clientId مطلوب" });
    }
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: await nextTicketNumber(),
        clientId,
        subject: data.subject,
        description: data.description || null,
        priority: data.priority || "NORMAL",
      },
    });
    await logAudit(req, "ticket.create", "SupportTicket", ticket.id);
    res.status(201).json({ ticket });
  } catch (e) { next(e); }
});

supportRouter.patch("/tickets/:id", requireStaff, async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const updateData: Record<string, unknown> = { ...data };
    if (data.status === "CLOSED") updateData.closedAt = new Date();
    const updated = await prisma.supportTicket.update({ where: { id: req.params.id }, data: updateData as never });
    await logAudit(req, "ticket.update", "SupportTicket", updated.id, data as never);
    res.json({ ticket: updated });
  } catch (e) { next(e); }
});

supportRouter.post("/tickets/:id/messages", async (req, res, next) => {
  try {
    const body = z.object({ message: z.string().min(1), isInternal: z.boolean().optional() }).parse(req.body);
    const t = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
    if (!t) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (t.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
      if (body.isInternal) return res.status(403).json({ error: "ملاحظات داخلية للموظفين فقط" });
    }
    const msg = await prisma.ticketMessage.create({
      data: {
        ticketId: t.id, senderId: req.user!.sub, message: body.message, isInternal: !!body.isInternal && isStaff(req),
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    await prisma.supportTicket.update({ where: { id: t.id }, data: { updatedAt: new Date() } });
    res.status(201).json({ message: msg });
  } catch (e) { next(e); }
});
