import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { currentClientId, isStaff } from "../lib/scope.js";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

const itemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().nonnegative(),
});
const createSchema = z.object({
  clientId: z.string(),
  projectId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  currency: z.string().default("SAR"),
  vatRate: z.number().min(0).max(1).default(0.15),
  dueAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

function nextInvoiceNumber() {
  const y = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `INV-${y}-${rand}`;
}

invoicesRouter.get("/", async (req, res) => {
  const where = isStaff(req) ? {} : { clientId: (await currentClientId(req)) ?? "__none__" };
  const invoices = await prisma.invoice.findMany({
    where,
    include: { items: true, client: { include: { user: { select: { name: true } } } } },
    orderBy: { issuedAt: "desc" },
  });
  res.json({ invoices });
});

invoicesRouter.get("/:id", async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: true, client: true, payments: true },
  });
  if (!invoice) return res.status(404).json({ error: "Not found" });
  if (!isStaff(req)) {
    const clientId = await currentClientId(req);
    if (invoice.clientId !== clientId) return res.status(403).json({ error: "Forbidden" });
  }
  res.json({ invoice });
});

invoicesRouter.post("/", requireRole("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const subtotal = parsed.data.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const vatAmount = +(subtotal * parsed.data.vatRate).toFixed(2);
  const total = +(subtotal + vatAmount).toFixed(2);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: parsed.data.invoiceNumber ?? nextInvoiceNumber(),
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId,
      status: parsed.data.status ?? "DRAFT",
      currency: parsed.data.currency,
      subtotal,
      vatAmount,
      total,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
      notes: parsed.data.notes,
      items: {
        create: parsed.data.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: +(it.unitPrice * it.quantity).toFixed(2),
        })),
      },
    },
    include: { items: true },
  });
  res.status(201).json({ invoice });
});

invoicesRouter.patch("/:id", requireRole("ADMIN", "ACCOUNTANT"), async (req, res) => {
  const patch = z
    .object({
      status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
      dueAt: z.string().datetime().optional(),
      paidAt: z.string().datetime().optional(),
      notes: z.string().optional(),
    })
    .safeParse(req.body);
  if (!patch.success) return res.status(400).json({ error: "Invalid input" });
  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      ...patch.data,
      dueAt: patch.data.dueAt ? new Date(patch.data.dueAt) : undefined,
      paidAt: patch.data.paidAt ? new Date(patch.data.paidAt) : undefined,
    },
  });
  res.json({ invoice });
});

invoicesRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  await prisma.invoice.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
