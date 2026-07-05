import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { currentClientId, isStaff } from "../lib/scope.js";

export const contractsRouter = Router();
contractsRouter.use(requireAuth);

const createSchema = z.object({
  clientId: z.string(),
  projectId: z.string().optional(),
  title: z.string().min(2),
  contractNumber: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]).optional(),
  value: z.number().optional(),
  currency: z.string().default("SAR"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  fileUrl: z.string().optional(),
});

function nextContractNumber() {
  const y = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `CT-${y}-${rand}`;
}

contractsRouter.get("/", async (req, res) => {
  const where = isStaff(req) ? {} : { clientId: (await currentClientId(req)) ?? "__none__" };
  const contracts = await prisma.contract.findMany({
    where,
    include: { client: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ contracts });
});

contractsRouter.get("/:id", async (req, res) => {
  const contract = await prisma.contract.findUnique({ where: { id: req.params.id }, include: { client: true } });
  if (!contract) return res.status(404).json({ error: "Not found" });
  if (!isStaff(req)) {
    const clientId = await currentClientId(req);
    if (contract.clientId !== clientId) return res.status(403).json({ error: "Forbidden" });
  }
  res.json({ contract });
});

contractsRouter.post("/", requireRole("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  const contract = await prisma.contract.create({
    data: {
      contractNumber: parsed.data.contractNumber ?? nextContractNumber(),
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      status: parsed.data.status ?? "DRAFT",
      value: parsed.data.value,
      currency: parsed.data.currency,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      fileUrl: parsed.data.fileUrl,
    },
  });
  res.status(201).json({ contract });
});

contractsRouter.patch("/:id", requireRole("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const contract = await prisma.contract.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    },
  });
  res.json({ contract });
});

contractsRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  await prisma.contract.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
