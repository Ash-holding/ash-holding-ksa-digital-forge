import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminRouter = Router();

// admins + support + accountants can read; only admin can mutate
adminRouter.use(requireAuth);

adminRouter.get("/stats", requireRole("ADMIN", "SUPPORT", "ACCOUNTANT"), async (_req, res) => {
  const [clients, projects, openInvoices, activeContracts, openTickets] = await Promise.all([
    prisma.client.count(),
    prisma.project.count(),
    prisma.invoice.count({ where: { status: { in: ["SENT", "OVERDUE"] } } }),
    prisma.contract.count({ where: { status: "ACTIVE" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } } }),
  ]);
  res.json({ clients, projects, openInvoices, activeContracts, openTickets });
});

adminRouter.get("/clients", requireRole("ADMIN", "SUPPORT", "ACCOUNTANT"), async (_req, res) => {
  const clients = await prisma.client.findMany({
    include: { user: { select: { email: true, name: true, isActive: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ clients });
});

adminRouter.get("/projects", requireRole("ADMIN", "SUPPORT"), async (_req, res) => {
  const projects = await prisma.project.findMany({
    include: { client: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ projects });
});

adminRouter.get("/invoices", requireRole("ADMIN", "ACCOUNTANT"), async (_req, res) => {
  const invoices = await prisma.invoice.findMany({
    include: { client: { include: { user: { select: { name: true } } } }, items: true },
    orderBy: { issuedAt: "desc" },
  });
  res.json({ invoices });
});

adminRouter.get("/contracts", requireRole("ADMIN", "ACCOUNTANT"), async (_req, res) => {
  const contracts = await prisma.contract.findMany({
    include: { client: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ contracts });
});

adminRouter.get("/tickets", requireRole("ADMIN", "SUPPORT"), async (_req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    include: { client: { include: { user: { select: { name: true } } } }, agent: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ tickets });
});

adminRouter.get("/services", requireRole("ADMIN"), async (_req, res) => {
  const services = await prisma.service.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ services });
});

adminRouter.get("/payments", requireRole("ADMIN", "ACCOUNTANT"), async (_req, res) => {
  const payments = await prisma.payment.findMany({
    include: { client: { include: { user: { select: { name: true } } } }, invoice: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ payments });
});

adminRouter.get("/files", requireRole("ADMIN", "SUPPORT"), async (_req, res) => {
  const files = await prisma.file.findMany({
    include: { uploader: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ files });
});
