import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";

export const servicesRouter = Router();
servicesRouter.use(requireAuth);

const SERVICE_TYPES = ["WEBSITE","MOBILE_APP","ADMIN_SYSTEM","HOSTING","VPS","DEDICATED_SERVER","SMTP","MARKETING","DESIGN","SUPPORT","OTHER"] as const;
const SERVICE_STATUSES = ["ACTIVE","SUSPENDED","AWAITING_PAYMENT","EXPIRED"] as const;

const serviceSchema = z.object({
  clientId: z.string().optional(),
  projectId: z.string().optional().nullable(),
  name: z.string().min(2),
  type: z.enum(SERVICE_TYPES).optional(),
  status: z.enum(SERVICE_STATUSES).optional(),
  price: z.number().optional().nullable(),
  currency: z.string().optional(),
  renewalDate: z.coerce.date().optional().nullable(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

servicesRouter.get("/", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    let where: import("@prisma/client").Prisma.ClientServiceWhereInput = {};
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
      where.clientId = cid;
    } else if (req.query.clientId) where.clientId = req.query.clientId as string;
    if (status) where.status = status as never;
    if (type) where.type = type as never;
    const [rows, total] = await Promise.all([
      prisma.clientService.findMany({
        where, include: { client: { include: { user: { select: { name: true } } } }, project: { select: { title: true } } },
        orderBy: { createdAt: "desc" }, skip, take,
      }),
      prisma.clientService.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});

servicesRouter.post("/", requireStaff, async (req, res, next) => {
  try {
    const data = serviceSchema.parse(req.body);
    if (!data.clientId) return res.status(400).json({ error: "clientId مطلوب" });
    const created = await prisma.clientService.create({ data: data as never });
    await logAudit(req, "service.create", "ClientService", created.id);
    res.status(201).json({ service: created });
  } catch (e) { next(e); }
});

servicesRouter.patch("/:id", requireStaff, async (req, res, next) => {
  try {
    const data = serviceSchema.partial().parse(req.body);
    const updated = await prisma.clientService.update({ where: { id: req.params.id }, data: data as never });
    await logAudit(req, "service.update", "ClientService", updated.id);
    res.json({ service: updated });
  } catch (e) { next(e); }
});

servicesRouter.delete("/:id", requireStaff, async (req, res, next) => {
  try {
    await prisma.clientService.delete({ where: { id: req.params.id } });
    await logAudit(req, "service.delete", "ClientService", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
