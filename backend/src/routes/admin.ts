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
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const day30Ago = new Date(now.getTime() - 30 * 86400_000);
    const day60Ago = new Date(now.getTime() - 60 * 86400_000);
    const day14Ahead = new Date(now.getTime() + 14 * 86400_000);

    const [
      clientsTotal, clientsPrev,
      activeProjects, activeProjectsPrev,
      unpaidInvoices, unpaidInvoicesPrev,
      pendingContracts, pendingContractsPrev,
      openTickets, openTicketsPrev,
      monthRevenueAgg, prevMonthRevenueAgg,
      recentClients, recentInvoices, recentTickets,
      groupProjects, groupInvoices,
      overdueAgg, activeContractsAgg,
      progressAgg, ticketMsgs,
      topClientsAgg,
      upcomingDeadlines,
      overdueInvoicesCount, urgentTicketsCount, dueSoonContractsCount,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { createdAt: { lt: monthStart } } }),
      prisma.project.count({ where: { status: { notIn: ["COMPLETED", "ON_HOLD"] } } }),
      prisma.project.count({ where: { status: { notIn: ["COMPLETED", "ON_HOLD"] }, createdAt: { lt: monthStart } } }),
      prisma.invoice.count({ where: { status: { in: ["UNPAID", "OVERDUE"] } } }),
      prisma.invoice.count({ where: { status: { in: ["UNPAID", "OVERDUE"] }, createdAt: { lt: monthStart } } }),
      prisma.contract.count({ where: { status: "PENDING_SIGNATURE" } }),
      prisma.contract.count({ where: { status: "PENDING_SIGNATURE", createdAt: { lt: monthStart } } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT"] } } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT"] }, createdAt: { lt: monthStart } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: monthStart } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: prevMonthStart, lt: monthStart } } }),
      prisma.client.findMany({ include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.invoice.findMany({ include: { client: { include: { user: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.supportTicket.findMany({ include: { client: { include: { user: { select: { name: true } } } } }, orderBy: { updatedAt: "desc" }, take: 5 }),
      prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.invoice.groupBy({ by: ["status"], _count: { _all: true }, _sum: { total: true } }),
      prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "OVERDUE" } }),
      prisma.contract.aggregate({ _sum: { value: true }, where: { status: "ACTIVE" } }),
      prisma.project.aggregate({ _avg: { progress: true }, where: { status: { notIn: ["COMPLETED", "ON_HOLD"] } } }),
      prisma.ticketMessage.findMany({
        where: { createdAt: { gte: day30Ago }, isInternal: false },
        select: { createdAt: true, ticketId: true, sender: { select: { role: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.groupBy({
        by: ["clientId"], _sum: { amount: true },
        where: { status: "SUCCESS", paidAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
        orderBy: { _sum: { amount: "desc" } }, take: 5,
      }),
      prisma.project.findMany({
        where: { status: { notIn: ["COMPLETED", "ON_HOLD"] }, dueDate: { gte: now, lte: day14Ahead } },
        include: { client: { include: { user: { select: { name: true } } } } },
        orderBy: { dueDate: "asc" }, take: 6,
      }),
      prisma.invoice.count({ where: { status: "OVERDUE" } }),
      prisma.supportTicket.count({ where: { priority: { in: ["HIGH", "URGENT"] }, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.contract.count({ where: { status: "ACTIVE", endDate: { gte: now, lte: day14Ahead } } }),
    ]);

    // 6-month revenue history
    const revenueMonths: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const agg = await prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: start, lt: end } } });
      revenueMonths.push({ month: start.toLocaleDateString("ar-SA", { month: "short" }), total: Number(agg._sum.amount || 0) });
    }

    // 12-week sparkline history for each metric
    const sparkPoints = 12;
    const weekMs = 7 * 86400_000;
    const buildSpark = async (kind: "revenue" | "clients" | "projects" | "invoices" | "contracts" | "tickets") => {
      const points: number[] = [];
      for (let i = sparkPoints - 1; i >= 0; i--) {
        const start = new Date(now.getTime() - (i + 1) * weekMs);
        const end = new Date(now.getTime() - i * weekMs);
        let v = 0;
        if (kind === "revenue") {
          const a = await prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS", paidAt: { gte: start, lt: end } } });
          v = Number(a._sum.amount || 0);
        } else if (kind === "clients") v = await prisma.client.count({ where: { createdAt: { gte: start, lt: end } } });
        else if (kind === "projects") v = await prisma.project.count({ where: { createdAt: { gte: start, lt: end } } });
        else if (kind === "invoices") v = await prisma.invoice.count({ where: { createdAt: { gte: start, lt: end } } });
        else if (kind === "contracts") v = await prisma.contract.count({ where: { createdAt: { gte: start, lt: end } } });
        else if (kind === "tickets") v = await prisma.supportTicket.count({ where: { createdAt: { gte: start, lt: end } } });
        points.push(v);
      }
      return points;
    };
    const [spRevenue, spClients, spProjects, spInvoices, spContracts, spTickets] = await Promise.all([
      buildSpark("revenue"), buildSpark("clients"), buildSpark("projects"),
      buildSpark("invoices"), buildSpark("contracts"), buildSpark("tickets"),
    ]);

    // KPI: collections rate = paid total / (paid + unpaid + overdue) total
    const [paidTotalAgg, allDueAgg] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "PAID" } }),
      prisma.invoice.aggregate({ _sum: { total: true }, where: { status: { in: ["PAID", "UNPAID", "OVERDUE"] } } }),
    ]);
    const paidT = Number(paidTotalAgg._sum.total || 0);
    const dueT = Number(allDueAgg._sum.total || 0);
    const collectionsRate = dueT > 0 ? Math.round((paidT / dueT) * 100) : 0;

    // KPI: avg ticket response hours (first staff reply after client first message, over last 30d)
    const byTicket = new Map<string, { first?: Date; reply?: Date }>();
    for (const m of ticketMsgs) {
      const rec = byTicket.get(m.ticketId) ?? {};
      if (!rec.first) rec.first = m.createdAt;
      if (!rec.reply && (m.sender.role === "ADMIN" || m.sender.role === "SUPPORT")) rec.reply = m.createdAt;
      byTicket.set(m.ticketId, rec);
    }
    const diffs: number[] = [];
    for (const { first, reply } of byTicket.values()) {
      if (first && reply && reply > first) diffs.push((reply.getTime() - first.getTime()) / 3_600_000);
    }
    const avgTicketResponseHours = diffs.length ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10 : 0;

    // Trends: (current - previous) as delta count
    const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);
    const monthRev = Number(monthRevenueAgg._sum.amount || 0);
    const prevRev = Number(prevMonthRevenueAgg._sum.amount || 0);

    // Top clients — resolve names
    const topClientIds = topClientsAgg.map((c) => c.clientId);
    const topClientNames = await prisma.client.findMany({
      where: { id: { in: topClientIds } },
      include: { user: { select: { name: true } } },
    });
    const nameMap = new Map(topClientNames.map((c) => [c.id, c.user.name || c.companyName || "—"]));
    const topClients = topClientsAgg.map((c) => ({
      name: nameMap.get(c.clientId) || "—",
      revenue: Number(c._sum.amount || 0),
    }));

    // Real alerts driven from DB state
    const alerts: { type: string; message: string; link: string }[] = [];
    if (overdueInvoicesCount > 0) alerts.push({ type: "danger", message: `${overdueInvoicesCount} فاتورة متأخرة`, link: "/admin/invoices" });
    if (urgentTicketsCount > 0) alerts.push({ type: "warning", message: `${urgentTicketsCount} تذكرة عاجلة`, link: "/admin/support" });
    if (dueSoonContractsCount > 0) alerts.push({ type: "info", message: `${dueSoonContractsCount} عقد ينتهي خلال 14 يوم`, link: "/admin/contracts" });

    res.json({
      cards: {
        clientsTotal, activeProjects, unpaidInvoices, pendingContracts, openTickets,
        monthRevenue: monthRev,
      },
      trends: {
        revenue: pct(monthRev, prevRev),
        clients: pct(clientsTotal, clientsPrev),
        projects: pct(activeProjects, activeProjectsPrev),
        invoices: pct(unpaidInvoices, unpaidInvoicesPrev),
        contracts: pct(pendingContracts, pendingContractsPrev),
        tickets: pct(openTickets, openTicketsPrev),
      },
      sparks: {
        revenue: spRevenue, clients: spClients, projects: spProjects,
        invoices: spInvoices, contracts: spContracts, tickets: spTickets,
      },
      kpis: {
        collectionsRate,
        avgProjectProgress: Math.round(Number(progressAgg._avg.progress || 0)),
        overdueAmount: Number(overdueAgg._sum.total || 0),
        activeContractsValue: Number(activeContractsAgg._sum.value || 0),
        avgTicketResponseHours,
      },
      alerts,
      revenueMonths,
      projectStatuses: groupProjects.map((g) => ({ status: g.status, count: g._count._all })),
      invoiceStatuses: groupInvoices.map((g) => ({ status: g.status, count: g._count._all, total: Number(g._sum.total || 0) })),
      topClients,
      upcomingDeadlines: upcomingDeadlines.map((p) => ({
        id: p.id, name: p.title, client: p.client.user.name,
        dueDate: p.dueDate, progress: p.progress, status: p.status,
      })),
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
