import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { currentClientId, isStaff } from "../lib/scope.js";

export const supportRouter = Router();
supportRouter.use(requireAuth);

const createTicket = z.object({
  subject: z.string().min(3),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  clientId: z.string().optional(), // staff can specify; clients use their own
  body: z.string().min(1),
});

const messageSchema = z.object({ body: z.string().min(1) });

function nextTicketNumber() {
  const y = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `TK-${y}-${rand}`;
}

supportRouter.get("/tickets", async (req, res) => {
  const where = isStaff(req) ? {} : { clientId: (await currentClientId(req)) ?? "__none__" };
  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      client: { include: { user: { select: { name: true, email: true } } } },
      agent: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ tickets });
});

supportRouter.get("/tickets/:id", async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      agent: { select: { id: true, name: true } },
      messages: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) return res.status(404).json({ error: "Not found" });
  if (!isStaff(req)) {
    const clientId = await currentClientId(req);
    if (ticket.clientId !== clientId) return res.status(403).json({ error: "Forbidden" });
  }
  res.json({ ticket });
});

supportRouter.post("/tickets", async (req, res) => {
  const parsed = createTicket.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  let clientId = parsed.data.clientId;
  if (!isStaff(req)) {
    clientId = (await currentClientId(req)) ?? undefined;
    if (!clientId) return res.status(404).json({ error: "Client profile missing" });
  }
  if (!clientId) return res.status(400).json({ error: "clientId required" });

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber: nextTicketNumber(),
      clientId,
      subject: parsed.data.subject,
      priority: parsed.data.priority ?? "NORMAL",
      messages: { create: { authorId: req.user!.sub, body: parsed.data.body } },
    },
    include: { messages: true },
  });
  res.status(201).json({ ticket });
});

supportRouter.post("/tickets/:id/messages", async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "Not found" });
  if (!isStaff(req)) {
    const clientId = await currentClientId(req);
    if (ticket.clientId !== clientId) return res.status(403).json({ error: "Forbidden" });
  }

  const message = await prisma.ticketMessage.create({
    data: { ticketId: ticket.id, authorId: req.user!.sub, body: parsed.data.body },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });
  res.status(201).json({ message });
});

supportRouter.patch("/tickets/:id", requireRole("ADMIN", "SUPPORT"), async (req, res) => {
  const patch = z
    .object({
      status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]).optional(),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
      assignedTo: z.string().nullable().optional(),
    })
    .safeParse(req.body);
  if (!patch.success) return res.status(400).json({ error: "Invalid input" });

  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: {
      ...patch.data,
      closedAt: patch.data.status === "CLOSED" ? new Date() : undefined,
    },
  });
  res.json({ ticket });
});
