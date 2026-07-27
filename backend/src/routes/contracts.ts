import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";
import { WA } from "../lib/whatsapp.js";

async function contractClientPhone(clientId: string): Promise<string | null> {
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: { select: { phone: true } } },
  });
  return c?.phone || c?.user?.phone || null;
}

export const contractsRouter = Router();
contractsRouter.use(requireAuth);

const CONTRACT_STATUSES = ["DRAFT", "SENT", "PENDING_SIGNATURE", "SIGNED", "CANCELLED"] as const;

const contractSchema = z.object({
  clientId: z.string(),
  projectId: z.string().optional().nullable(),
  title: z.string().min(2),
  status: z.enum(CONTRACT_STATUSES).optional(),
  value: z.number().optional().nullable(),
  currency: z.string().optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  filePath: z.string().optional().nullable(),
  signedFilePath: z.string().optional().nullable(),
  signedAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function nextContractNumber(): Promise<string> {
  const y = new Date().getFullYear();
  const count = await prisma.contract.count({ where: { contractNumber: { startsWith: `CTR-${y}-` } } });
  return `CTR-${y}-${String(count + 1).padStart(4, "0")}`;
}

contractsRouter.get("/", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    let where: import("@prisma/client").Prisma.ContractWhereInput = {};
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
      where.clientId = cid;
    } else if (req.query.clientId) where.clientId = req.query.clientId as string;
    if (req.query.status) where.status = req.query.status as never;

    const [rows, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: { client: { include: { user: { select: { name: true, email: true } } } }, project: { select: { title: true } } },
        orderBy: { createdAt: "desc" }, skip, take,
      }),
      prisma.contract.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});

contractsRouter.get("/:id", async (req, res, next) => {
  try {
    const c = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { client: { include: { user: true } }, project: true, files: true },
    });
    if (!c) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (c.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ contract: c });
  } catch (e) { next(e); }
});

contractsRouter.post("/", requireStaff, async (req, res, next) => {
  try {
    const data = contractSchema.parse(req.body);
    const created = await prisma.contract.create({
      data: { ...data, contractNumber: await nextContractNumber() } as never,
    });
    await logAudit(req, "contract.create", "Contract", created.id);
    const phone = await contractClientPhone(created.clientId);
    WA.notify(
      phone,
      `ASH HOLDING — عقد جديد 📄\nرقم العقد: ${created.contractNumber}\nالعنوان: ${created.title}\nيرجى مراجعته من بوابة العميل.`,
      { kind: "contract.create", entityId: created.id },
    );
    res.status(201).json({ contract: created });
  } catch (e) { next(e); }
});

contractsRouter.patch("/:id", requireStaff, async (req, res, next) => {
  try {
    const data = contractSchema.partial().parse(req.body);
    if (data.status === "SIGNED" && !data.signedAt) data.signedAt = new Date();
    const updated = await prisma.contract.update({ where: { id: req.params.id }, data: data as never });
    await logAudit(req, "contract.update", "Contract", updated.id);
    if (data.status === "SIGNED" || data.status === "SENT" || data.status === "PENDING_SIGNATURE") {
      const phone = await contractClientPhone(updated.clientId);
      const statusMsg =
        data.status === "SIGNED" ? `تم توقيع العقد ✅` :
        data.status === "PENDING_SIGNATURE" ? `العقد بانتظار توقيعك ✍️` :
        `تم إرسال العقد إليك 📤`;
      WA.notify(
        phone,
        `ASH HOLDING\n${statusMsg}\nرقم العقد: ${updated.contractNumber}\n${updated.title}`,
        { kind: `contract.${data.status.toLowerCase()}`, entityId: updated.id },
      );
    }
    res.json({ contract: updated });
  } catch (e) { next(e); }
});

// Client: signal signature (placeholder – marks pending; admin uploads signed file)
contractsRouter.post("/:id/request-sign", async (req, res, next) => {
  try {
    const c = await prisma.contract.findUnique({ where: { id: req.params.id } });
    if (!c) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (c.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
    }
    const updated = await prisma.contract.update({ where: { id: c.id }, data: { status: "PENDING_SIGNATURE" } });
    await logAudit(req, "contract.request_sign", "Contract", c.id);
    res.json({ contract: updated });
  } catch (e) { next(e); }
});

contractsRouter.delete("/:id", requireStaff, async (req, res, next) => {
  try {
    await prisma.contract.delete({ where: { id: req.params.id } });
    await logAudit(req, "contract.delete", "Contract", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
