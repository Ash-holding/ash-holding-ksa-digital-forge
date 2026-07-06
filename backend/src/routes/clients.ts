import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff, requireAdmin } from "../middleware/auth.js";
import { currentClientId, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";
import { lookupIp, normalizeIp } from "../lib/geo.js";

export const clientsRouter = Router();
clientsRouter.use(requireAuth);


const clientSchema = z.object({
  companyName: z.string().optional().nullable(),
  commercialNumber: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  status: z.enum(["ACTIVE", "DISABLED", "PENDING"]).optional(),
});

const createClientSchema = clientSchema.extend({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

// Staff: list all clients (search + filters + pagination)
clientsRouter.get("/", requireStaff, async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const status = req.query.status as string | undefined;
    const verification = req.query.verification as string | undefined;
    const { skip, take, page, pageSize } = paging(req);
    const where = {
      ...(status ? { status: status as never } : {}),
      ...(verification ? { verificationStatus: verification as never } : {}),
      ...(q
        ? {
            OR: [
              { companyName: { contains: q, mode: "insensitive" as const } },
              { user: { name: { contains: q, mode: "insensitive" as const } } },
              { user: { email: { contains: q, mode: "insensitive" as const } } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true, phone: true, status: true, avatarUrl: true, lastLoginAt: true } } },
        orderBy: { createdAt: "desc" },
        skip, take,
      }),
      prisma.client.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});


// Client: own profile
clientsRouter.get("/me", async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { userId: req.user!.sub },
    include: { user: { select: { email: true, name: true, phone: true, avatarUrl: true } } },
  });
  res.json({ client });
});

// Client: dashboard summary
clientsRouter.get("/me/overview", async (req, res, next) => {
  try {
    const clientId = await currentClientId(req);
    if (!clientId) return res.status(404).json({ error: "لا يوجد ملف عميل" });
    const [activeProjects, activeServices, unpaidInvoices, pendingContracts, openTickets, unreadNotifications, recentFiles] =
      await Promise.all([
        prisma.project.count({ where: { clientId, status: { notIn: ["COMPLETED", "ON_HOLD"] } } }),
        prisma.clientService.count({ where: { clientId, status: "ACTIVE" } }),
        prisma.invoice.count({ where: { clientId, status: { in: ["UNPAID", "OVERDUE"] } } }),
        prisma.contract.count({ where: { clientId, status: "PENDING_SIGNATURE" } }),
        prisma.supportTicket.count({ where: { clientId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT"] } } }),
        prisma.notification.count({ where: { userId: req.user!.sub, isRead: false } }),
        prisma.file.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 5 }),
      ]);
    const recentProjects = await prisma.project.findMany({
      where: { clientId }, orderBy: { updatedAt: "desc" }, take: 4,
    });
    res.json({
      stats: { activeProjects, activeServices, unpaidInvoices, pendingContracts, openTickets, unreadNotifications },
      recentProjects, recentFiles,
    });
  } catch (e) { next(e); }
});

clientsRouter.patch("/me", async (req, res, next) => {
  try {
    const parsed = clientSchema.partial().parse(req.body);
    const updated = await prisma.client.update({ where: { userId: req.user!.sub }, data: parsed });
    res.json({ client: updated });
  } catch (e) { next(e); }
});

// Staff: get single client (full profile)
clientsRouter.get("/:id", requireStaff, async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true, status: true, avatarUrl: true, lastLoginAt: true, lastIpAddress: true } },
        verifiedBy: { select: { id: true, name: true } },
        projects: { orderBy: { createdAt: "desc" } },
        services: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" }, take: 20 },
        contracts: { orderBy: { createdAt: "desc" } },
        tickets: { orderBy: { createdAt: "desc" }, take: 10 },
        payments: { orderBy: { createdAt: "desc" }, take: 20 },
        files: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!client) return res.status(404).json({ error: "غير موجود" });
    const activeSessions = await prisma.refreshToken.count({
      where: { userId: client.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    res.json({ client: { ...client, activeSessions } });
  } catch (e) { next(e); }
});


// Admin: create new client (creates user + client profile)
clientsRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const data = createClientSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(409).json({ error: "البريد مستخدم مسبقاً" });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email, name: data.name, phone: data.phone || null, passwordHash, role: "CLIENT",
        client: {
          create: {
            companyName: data.companyName || null, commercialNumber: data.commercialNumber || null,
            taxNumber: data.taxNumber || null, phone: data.phone || null,
            contactEmail: data.contactEmail || null, address: data.address || null,
            city: data.city || null, country: data.country || "SA",
          },
        },
      },
      include: { client: true },
    });
    await logAudit(req, "client.create", "Client", user.client!.id, { email: user.email });
    res.status(201).json({ client: user.client });
  } catch (e) { next(e); }
});

// Admin: update client + optionally toggle user status
clientsRouter.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const parsed = clientSchema.partial().extend({
      userStatus: z.enum(["ACTIVE", "DISABLED", "PENDING"]).optional(),
      name: z.string().optional(),
      phone: z.string().optional().nullable(),
    }).parse(req.body);
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        companyName: parsed.companyName, commercialNumber: parsed.commercialNumber, taxNumber: parsed.taxNumber,
        phone: parsed.phone, contactEmail: parsed.contactEmail, address: parsed.address,
        city: parsed.city, country: parsed.country, status: parsed.status,
      },
    });
    if (parsed.userStatus || parsed.name) {
      await prisma.user.update({
        where: { id: client.userId },
        data: { status: parsed.userStatus, name: parsed.name },
      });
    }
    await logAudit(req, "client.update", "Client", client.id);
    res.json({ client });
  } catch (e) { next(e); }
});

clientsRouter.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const c = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!c) return res.status(404).json({ error: "غير موجود" });
    await prisma.user.update({ where: { id: c.userId }, data: { status: "DISABLED" } });
    await logAudit(req, "client.disable", "Client", c.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Admin: verify client identity
clientsRouter.post("/:id/verify", requireAdmin, async (req, res, next) => {
  try {
    const { note } = z.object({ note: z.string().optional() }).parse(req.body ?? {});
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        verifiedById: req.user!.sub,
        verificationNote: note ?? null,
      },
    });
    await logAudit(req, "client.verify", "Client", client.id);
    res.json({ client });
  } catch (e) { next(e); }
});

// Admin: unverify / reject
clientsRouter.post("/:id/unverify", requireAdmin, async (req, res, next) => {
  try {
    const { reject, note } = z.object({
      reject: z.boolean().optional(),
      note: z.string().optional(),
    }).parse(req.body ?? {});
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: reject ? "REJECTED" : "UNVERIFIED",
        verifiedAt: null,
        verifiedById: null,
        verificationNote: note ?? null,
      },
    });
    await logAudit(req, "client.unverify", "Client", client.id);
    res.json({ client });
  } catch (e) { next(e); }
});

// Admin: refresh geo from stored IP (or new IP)
clientsRouter.post("/:id/refresh-geo", requireAdmin, async (req, res, next) => {
  try {
    const body = z.object({ ip: z.string().optional() }).parse(req.body ?? {});
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "غير موجود" });
    const ip = normalizeIp(body.ip || existing.lastIpAddress);
    if (!ip) return res.status(400).json({ error: "لا يوجد عنوان IP صالح" });
    const geo = await lookupIp(ip);
    if (!geo) return res.status(502).json({ error: "تعذّر جلب بيانات الموقع" });
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        lastIpAddress: ip,
        lastIpCountry: geo.countryCode,
        lastIpCity: geo.city,
        lastIpRegion: geo.region,
        lat: geo.lat ?? undefined,
        lng: geo.lng ?? undefined,
      },
    });
    await logAudit(req, "client.refresh-geo", "Client", client.id);
    res.json({ client });
  } catch (e) { next(e); }
});

