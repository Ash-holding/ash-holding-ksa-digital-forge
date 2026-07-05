import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { currentClientId, isStaff } from "../lib/scope.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const createSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "PLANNING", "IN_PROGRESS", "REVIEW", "COMPLETED", "ARCHIVED"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  budget: z.number().optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
});

projectsRouter.get("/", async (req, res) => {
  if (isStaff(req)) {
    const projects = await prisma.project.findMany({
      include: { client: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ projects });
  }
  const clientId = await currentClientId(req);
  if (!clientId) return res.status(404).json({ error: "Client not found" });
  const projects = await prisma.project.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ projects });
});

projectsRouter.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { client: true, invoices: true, contracts: true, files: true },
  });
  if (!project) return res.status(404).json({ error: "Not found" });
  if (!isStaff(req)) {
    const clientId = await currentClientId(req);
    if (project.clientId !== clientId) return res.status(403).json({ error: "Forbidden" });
  }
  res.json({ project });
});

projectsRouter.post("/", requireRole("ADMIN", "SUPPORT"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  if (!parsed.data.clientId) return res.status(400).json({ error: "clientId required" });
  const project = await prisma.project.create({
    data: {
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status ?? "DRAFT",
      progress: parsed.data.progress ?? 0,
      budget: parsed.data.budget,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    },
  });
  res.status(201).json({ project });
});

projectsRouter.patch("/:id", requireRole("ADMIN", "SUPPORT"), async (req, res) => {
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    },
  });
  res.json({ project });
});

projectsRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
