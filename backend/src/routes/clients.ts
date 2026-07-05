import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { currentClientId, isStaff } from "../lib/scope.js";

export const clientsRouter = Router();
clientsRouter.use(requireAuth);

const upsertSchema = z.object({
  companyName: z.string().optional(),
  taxNumber: z.string().optional(),
  billingAddress: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("SA"),
});

// Staff: list all clients
clientsRouter.get("/", requireRole("ADMIN", "SUPPORT", "ACCOUNTANT"), async (_req, res) => {
  const clients = await prisma.client.findMany({
    include: { user: { select: { email: true, name: true, phone: true, isActive: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ clients });
});

// Any authenticated user: get own client profile
clientsRouter.get("/me", async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { userId: req.user!.sub },
    include: { user: { select: { email: true, name: true, phone: true } } },
  });
  res.json({ client });
});

// Client dashboard overview counts
clientsRouter.get("/me/overview", async (req, res) => {
  const clientId = await currentClientId(req);
  if (!clientId) return res.status(404).json({ error: "Client not found" });
  const [projects, invoices, contracts, tickets, services, payments, files, notifications] =
    await Promise.all([
      prisma.project.count({ where: { clientId } }),
      prisma.invoice.count({ where: { clientId } }),
      prisma.contract.count({ where: { clientId } }),
      prisma.supportTicket.count({ where: { clientId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } } }),
      prisma.clientService.count({ where: { clientId, status: "active" } }),
      prisma.payment.count({ where: { clientId } }),
      prisma.file.count({ where: { clientId } }),
      prisma.notification.count({ where: { userId: req.user!.sub, isRead: false } }),
    ]);
  res.json({ projects, invoices, contracts, tickets, services, payments, files, notifications });
});

clientsRouter.patch("/me", async (req, res) => {
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const updated = await prisma.client.update({
    where: { userId: req.user!.sub },
    data: parsed.data,
  });
  res.json({ client: updated });
});

// Staff: get one client
clientsRouter.get("/:id", requireRole("ADMIN", "SUPPORT", "ACCOUNTANT"), async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, name: true, phone: true, isActive: true } },
      projects: true,
      invoices: true,
      contracts: true,
    },
  });
  if (!client) return res.status(404).json({ error: "Not found" });
  res.json({ client });
});

// Staff: update any client
clientsRouter.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const updated = await prisma.client.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ client: updated });
});

export { isStaff };
