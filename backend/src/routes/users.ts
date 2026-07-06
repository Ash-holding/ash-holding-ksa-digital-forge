import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin);

const ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "ACCOUNTANT", "CLIENT"] as const;
const STATUSES = ["ACTIVE", "DISABLED", "PENDING"] as const;

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  password: z.string().min(8),
  role: z.enum(ROLES),
  status: z.enum(STATUSES).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(ROLES).optional(),
  status: z.enum(STATUSES).optional(),
  password: z.string().min(8).optional(),
});

usersRouter.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const role = req.query.role as string | undefined;
    const { skip, take, page, pageSize } = paging(req);
    const where: import("@prisma/client").Prisma.UserWhereInput = {
      ...(role ? { role: role as never } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, role: true, status: true, avatarUrl: true, lastLoginAt: true, createdAt: true },
        orderBy: { createdAt: "desc" }, skip, take,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name, email: data.email, phone: data.phone || null,
        role: data.role, status: data.status || "ACTIVE", passwordHash,
      },
    });
    await logAudit(req, "user.create", "User", user.id, { role: user.role });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } });
  } catch (e) { next(e); }
});

usersRouter.patch("/:id", async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const payload: Record<string, unknown> = { ...data };
    if (data.password) {
      payload.passwordHash = await bcrypt.hash(data.password, 10);
      delete payload.password;
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: payload });
    await logAudit(req, "user.update", "User", user.id);
    res.json({ user: { id: user.id, name: user.name, role: user.role, status: user.status } });
  } catch (e) { next(e); }
});

usersRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { status: "DISABLED" } });
    await logAudit(req, "user.disable", "User", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
