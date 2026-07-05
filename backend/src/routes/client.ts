import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const clientRouter = Router();

clientRouter.use(requireAuth, requireRole("CLIENT"));

async function getClientId(userId: string) {
  const c = await prisma.client.findUnique({ where: { userId }, select: { id: true } });
  return c?.id;
}

clientRouter.get("/overview", async (req, res) => {
  const clientId = await getClientId(req.user!.sub);
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

clientRouter.get("/projects", async (req, res) => {
  const clientId = await getClientId(req.user!.sub);
  const projects = await prisma.project.findMany({
    where: { clientId: clientId! },
    orderBy: { createdAt: "desc" },
  });
  res.json({ projects });
});

clientRouter.get("/invoices", async (req, res) => {
  const clientId = await getClientId(req.user!.sub);
  const invoices = await prisma.invoice.findMany({
    where: { clientId: clientId! },
    include: { items: true },
    orderBy: { issuedAt: "desc" },
  });
  res.json({ invoices });
});

clientRouter.get("/contracts", async (req, res) => {
  const clientId = await getClientId(req.user!.sub);
  const contracts = await prisma.contract.findMany({
    where: { clientId: clientId! },
    orderBy: { createdAt: "desc" },
  });
  res.json({ contracts });
});

clientRouter.get("/tickets", async (req, res) => {
  const clientId = await getClientId(req.user!.sub);
  const tickets = await prisma.supportTicket.findMany({
    where: { clientId: clientId! },
    orderBy: { createdAt: "desc" },
  });
  res.json({ tickets });
});
