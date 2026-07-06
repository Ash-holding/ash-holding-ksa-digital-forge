import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const PROJECT_STATUSES = ["NEW", "PLANNING", "DESIGN", "DEVELOPMENT", "WAITING_CLIENT", "TESTING", "COMPLETED", "ON_HOLD"] as const;

const projectSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
  progress: z.number().min(0).max(100).optional(),
  budget: z.number().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
});

projectsRouter.get("/", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    const q = String(req.query.q || "").trim();
    const status = req.query.status as string | undefined;
    const clientIdQuery = req.query.clientId as string | undefined;

    let where: import("@prisma/client").Prisma.ProjectWhereInput = {};
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
      where.clientId = cid;
    } else if (clientIdQuery) {
      where.clientId = clientIdQuery;
    }
    if (status) where.status = status as never;
    if (q) where.title = { contains: q, mode: "insensitive" };

    const [rows, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { client: { include: { user: { select: { name: true, email: true } } } } },
        orderBy: { updatedAt: "desc" },
        skip, take,
      }),
      prisma.project.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});

projectsRouter.get("/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: { include: { user: { select: { name: true, email: true } } } },
        notes: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" } },
        files: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
        contracts: { orderBy: { createdAt: "desc" } },
        services: true,
      },
    });
    if (!project) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (project.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
      // hide internal notes from client
      project.notes = project.notes.filter((n) => n.visibility !== "INTERNAL");
    }
    res.json({ project });
  } catch (e) { next(e); }
});

projectsRouter.post("/", requireStaff, async (req, res, next) => {
  try {
    const data = projectSchema.parse(req.body);
    if (!data.clientId) return res.status(400).json({ error: "clientId مطلوب" });
    const created = await prisma.project.create({ data: data as never });
    await logAudit(req, "project.create", "Project", created.id);
    res.status(201).json({ project: created });
  } catch (e) { next(e); }
});

projectsRouter.patch("/:id", requireStaff, async (req, res, next) => {
  try {
    const data = projectSchema.partial().parse(req.body);
    const updated = await prisma.project.update({ where: { id: req.params.id }, data: data as never });
    await logAudit(req, "project.update", "Project", updated.id);
    res.json({ project: updated });
  } catch (e) { next(e); }
});

projectsRouter.delete("/:id", requireStaff, async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    await logAudit(req, "project.delete", "Project", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Project notes
projectsRouter.post("/:id/notes", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({ content: z.string().min(1), visibility: z.enum(["INTERNAL", "CLIENT"]).default("CLIENT") }).parse(req.body);
    if (!isStaff(req) && body.visibility === "INTERNAL") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const note = await prisma.projectNote.create({
      data: { projectId: req.params.id, authorId: req.user!.sub, content: body.content, visibility: body.visibility },
    });
    res.status(201).json({ note });
  } catch (e) { next(e); }
});
