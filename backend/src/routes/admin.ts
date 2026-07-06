import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { paging } from "../lib/scope.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireStaff);

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      clientsTotal, activeProjects, unpaidInvoices, pendingContracts,
      openTickets, monthRevenueAgg, recentClients, recentInvoices, recentTickets,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.project.count({ where: { status: { notIn: ["COMPLETED", "ON_HOLD"] } } }),
      prisma.invoice.count({ where: { status: { in: ["UNPAID", "OVERDUE"] } } }),
      prisma.contract.count({ where: { status: "PENDING_SIGNATURE" } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT"] } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart } } }),
      prisma.client.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" }, take: 5,
      }),
      prisma.invoice.findMany({
        include: { client: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" }, take: 5,
      }),
      prisma.supportTicket.findMany({
        include: { client: { include: { user: { select: { name: true } } } } },
        orderBy: { updatedAt: "desc" }, take: 5,
      }),
    ]);

    // Monthly revenue for last 6 months
    const revenueMonths: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const agg = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCESS", paidAt: { gte: start, lt: end } },
      });
      revenueMonths.push({
        month: start.toLocaleDateString("ar-SA", { month: "short", year: "numeric" }),
        total: Number(agg._sum.amount || 0),
      });
    }

    // Project status distribution
    const groupProjects = await prisma.project.groupBy({ by: ["status"], _count: { _all: true } });

    res.json({
      cards: {
        clientsTotal, activeProjects, unpaidInvoices, pendingContracts, openTickets,
        monthRevenue: Number(monthRevenueAgg._sum.amount || 0),
      },
      revenueMonths,
      projectStatuses: groupProjects.map((g) => ({ status: g.status, count: g._count._all })),
      recentClients, recentInvoices, recentTickets,
    });
  } catch (e) { next(e); }
});

adminRouter.get("/audit-log", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" }, skip, take,
      }),
      prisma.auditLog.count(),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});
