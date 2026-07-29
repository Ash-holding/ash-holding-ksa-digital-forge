import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";
import { WA } from "../lib/whatsapp.js";

// ---------- Labels ----------
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "📝 مسودة",
  SUBMITTED: "📥 تم التقديم",
  UNDER_REVIEW: "🔍 قيد المراجعة",
  QUOTED: "💰 تم التسعير",
  AWAITING_PAYMENT: "⏳ بانتظار الدفع",
  PAID: "✅ مدفوع",
  PROVISIONING: "⚙️ قيد التجهيز",
  ACTIVE: "🚀 مُفعّلة",
  REJECTED: "❌ مرفوض",
  CANCELLED: "🚫 ملغى",
};

const KIND_LABEL: Record<string, string> = {
  NEW_SUBSCRIPTION: "اشتراك جديد",
  QUOTE_REQUEST: "طلب تسعير",
  RENEWAL_UPGRADE: "تجديد/ترقية",
};

function shortRef(id: string) {
  return `SRQ-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function adminPhones(): string[] {
  const raw = process.env.ADMIN_WHATSAPP || process.env.ADMIN_PHONE || "";
  return raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
}

async function clientPhone(clientId: string): Promise<string | null> {
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: { select: { phone: true } } },
  });
  return c?.phone || c?.user?.phone || null;
}

function fmtMoney(n: unknown): string {
  const v = Number(n ?? 0);
  return `${v.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;
}

// ---------- Schemas ----------
const createSchema = z.object({
  kind: z.enum(["NEW_SUBSCRIPTION", "QUOTE_REQUEST", "RENEWAL_UPGRADE"]),
  catalogKey: z.string().min(1),
  itemKey: z.string().min(1),
  serviceType: z.enum([
    "WEBSITE","MOBILE_APP","ADMIN_SYSTEM","HOSTING","VPS","DEDICATED_SERVER",
    "SMTP","MARKETING","DESIGN","SUPPORT","OTHER",
  ]).default("OTHER"),
  title: z.string().min(2).max(200),
  description: z.string().max(4000).optional(),
  specs: z.record(z.string(), z.any()).optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  basePrice: z.number().nonnegative().optional(),
  currency: z.string().default("SAR"),
  billingCycle: z.enum(["ONE_TIME","MONTHLY","QUARTERLY","YEARLY"]).default("ONE_TIME"),
  attachedServiceId: z.string().optional(),
  clientNotes: z.string().max(2000).optional(),
});

const messageSchema = z.object({
  content: z.string().min(1).max(4000),
  isInternal: z.boolean().optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
});

const quoteSchema = z.object({
  quotedPrice: z.number().nonnegative(),
  currency: z.string().default("SAR"),
  billingCycle: z.enum(["ONE_TIME","MONTHLY","QUARTERLY","YEARLY"]).optional(),
  adminNotes: z.string().max(4000).optional(),
});

const statusSchema = z.object({
  status: z.enum([
    "SUBMITTED","UNDER_REVIEW","QUOTED","AWAITING_PAYMENT","PAID",
    "PROVISIONING","ACTIVE","REJECTED","CANCELLED",
  ]),
  note: z.string().max(2000).optional(),
  rejectReason: z.string().max(1000).optional(),
});

export const serviceRequestsRouter = Router();

// ---------- LIST ----------
serviceRequestsRouter.get("/", requireAuth, async (req, res) => {
  const { page, pageSize, skip, take } = paging(req);
  const staff = isStaff(req);
  const where: any = {};
  if (!staff) {
    const cid = await currentClientId(req);
    if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
    where.clientId = cid;
  } else if (req.query.clientId) {
    where.clientId = String(req.query.clientId);
  }
  if (req.query.status) where.status = String(req.query.status);
  if (req.query.kind) where.kind = String(req.query.kind);

  const [rows, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where, skip, take,
      orderBy: { createdAt: "desc" },
      include: {
        client: { include: { user: { select: { name: true, email: true, phone: true } } } },
      },
    }),
    prisma.serviceRequest.count({ where }),
  ]);
  res.json({ rows, total, page, pageSize });
});

// ---------- GET ONE ----------
serviceRequestsRouter.get("/:id", requireAuth, async (req, res) => {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: req.params.id },
    include: {
      client: { include: { user: { select: { name: true, email: true, phone: true } } } },
      messages: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!request) return res.status(404).json({ error: "Not found" });
  if (!isStaff(req)) {
    const cid = await currentClientId(req);
    if (request.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
  }
  res.json(request);
});

// ---------- CREATE (client) ----------
serviceRequestsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const cid = await currentClientId(req);
  if (!cid) return res.status(400).json({ error: "Client profile required" });

  const created = await prisma.serviceRequest.create({
    data: {
      code: "TMP",
      clientId: cid,
      kind: parsed.data.kind,
      status: "SUBMITTED",
      catalogKey: parsed.data.catalogKey,
      itemKey: parsed.data.itemKey,
      serviceType: parsed.data.serviceType,
      title: parsed.data.title,
      description: parsed.data.description,
      specs: parsed.data.specs as any,
      attachments: parsed.data.attachments as any,
      basePrice: parsed.data.basePrice as any,
      currency: parsed.data.currency,
      billingCycle: parsed.data.billingCycle,
      attachedServiceId: parsed.data.attachedServiceId,
      clientNotes: parsed.data.clientNotes,
      submittedAt: new Date(),
    },
  });
  const code = shortRef(created.id);
  const updated = await prisma.serviceRequest.update({
    where: { id: created.id },
    data: { code },
  });

  await prisma.serviceRequestEvent.create({
    data: { requestId: created.id, actorId: req.user!.sub, kind: "CREATED", toStatus: "SUBMITTED" },
  });

  await logAudit({ req, action: "service_request.create", entity: "ServiceRequest", entityId: created.id });

  // Notify admins
  const msg =
    `📥 *طلب خدمة جديد*\n` +
    `المرجع: *${code}*\n` +
    `النوع: ${KIND_LABEL[parsed.data.kind]}\n` +
    `الخدمة: ${parsed.data.title}\n` +
    (parsed.data.basePrice ? `السعر المبدئي: ${fmtMoney(parsed.data.basePrice)}\n` : ``) +
    `الحالة: ${STATUS_LABEL.SUBMITTED}`;
  for (const p of adminPhones()) WA.send(p, msg, { kind: "service_request", entityId: created.id });

  res.status(201).json(updated);
});

// ---------- CLIENT: cancel ----------
serviceRequestsRouter.post("/:id/cancel", requireAuth, async (req, res) => {
  const request = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: "Not found" });
  if (!isStaff(req)) {
    const cid = await currentClientId(req);
    if (request.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
  }
  if (["ACTIVE","PAID","PROVISIONING"].includes(request.status)) {
    return res.status(400).json({ error: "لا يمكن إلغاء طلب بعد الدفع" });
  }
  const updated = await prisma.serviceRequest.update({
    where: { id: request.id }, data: { status: "CANCELLED" },
  });
  await prisma.serviceRequestEvent.create({
    data: { requestId: request.id, actorId: req.user!.sub, kind: "CANCELLED", fromStatus: request.status, toStatus: "CANCELLED" },
  });
  res.json(updated);
});

// ---------- MESSAGES ----------
serviceRequestsRouter.post("/:id/messages", requireAuth, async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const request = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: "Not found" });
  const staff = isStaff(req);
  if (!staff) {
    const cid = await currentClientId(req);
    if (request.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
  }
  const msg = await prisma.serviceRequestMessage.create({
    data: {
      requestId: request.id,
      authorId: req.user!.sub,
      content: parsed.data.content,
      isInternal: staff ? Boolean(parsed.data.isInternal) : false,
      attachments: parsed.data.attachments as any,
    },
  });

  // Notify counterparty
  if (staff && !msg.isInternal) {
    const phone = await clientPhone(request.clientId);
    if (phone) WA.send(phone, `💬 رسالة جديدة على طلب الخدمة *${request.code}*\n${parsed.data.content.slice(0, 200)}`, { kind: "service_request", entityId: request.id });
  } else if (!staff) {
    for (const p of adminPhones()) WA.send(p, `💬 رسالة عميل على *${request.code}*\n${parsed.data.content.slice(0, 200)}`, { kind: "service_request", entityId: request.id });
  }
  res.status(201).json(msg);
});

// =============== ADMIN ===============

// ---------- SET QUOTE ----------
serviceRequestsRouter.post("/:id/quote", requireAuth, requireStaff, async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const request = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.serviceRequest.update({
    where: { id: request.id },
    data: {
      quotedPrice: parsed.data.quotedPrice as any,
      currency: parsed.data.currency,
      billingCycle: parsed.data.billingCycle ?? request.billingCycle,
      adminNotes: parsed.data.adminNotes ?? request.adminNotes,
      status: "QUOTED",
      quotedAt: new Date(),
    },
  });
  await prisma.serviceRequestEvent.create({
    data: { requestId: request.id, actorId: req.user!.sub, kind: "QUOTED", fromStatus: request.status, toStatus: "QUOTED", note: `Quoted ${parsed.data.quotedPrice}` },
  });

  const phone = await clientPhone(request.clientId);
  if (phone) {
    const msg =
      `💰 *عرض سعر جديد*\n` +
      `طلبك ${request.code} — ${request.title}\n` +
      `السعر: *${fmtMoney(parsed.data.quotedPrice)}*\n` +
      `يمكنك المراجعة والدفع من بوابة العميل.`;
    WA.send(phone, msg, { kind: "service_request", entityId: request.id });
  }

  res.json(updated);
});

// ---------- CHANGE STATUS ----------
serviceRequestsRouter.patch("/:id/status", requireAuth, requireStaff, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const request = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: "Not found" });

  const data: any = { status: parsed.data.status };
  if (parsed.data.status === "PAID") data.paidAt = new Date();
  if (parsed.data.status === "ACTIVE") data.activatedAt = new Date();
  if (parsed.data.status === "REJECTED") data.rejectReason = parsed.data.rejectReason ?? parsed.data.note;

  // Auto-provision service on ACTIVE for subscriptions
  if (parsed.data.status === "ACTIVE" && !request.linkedServiceId && request.kind === "NEW_SUBSCRIPTION") {
    const svc = await prisma.clientService.create({
      data: {
        clientId: request.clientId,
        name: request.title,
        type: request.serviceType,
        status: "ACTIVE",
        price: (request.quotedPrice ?? request.basePrice) as any,
        currency: request.currency,
      },
    });
    data.linkedServiceId = svc.id;
  }

  const updated = await prisma.serviceRequest.update({ where: { id: request.id }, data });
  await prisma.serviceRequestEvent.create({
    data: {
      requestId: request.id, actorId: req.user!.sub, kind: "STATUS_CHANGE",
      fromStatus: request.status, toStatus: parsed.data.status, note: parsed.data.note,
    },
  });

  const phone = await clientPhone(request.clientId);
  if (phone) {
    WA.send(phone, `🔔 تحديث طلب الخدمة *${request.code}*\nالحالة الجديدة: ${STATUS_LABEL[parsed.data.status]}` + (parsed.data.note ? `\n${parsed.data.note}` : ``), { kind: "service_request", entityId: request.id });
  }

  await logAudit({ req, action: "service_request.status", entity: "ServiceRequest", entityId: request.id, meta: { to: parsed.data.status } });
  res.json(updated);
});

// ---------- ADMIN: delete ----------
serviceRequestsRouter.delete("/:id", requireAuth, requireStaff, async (req, res) => {
  await prisma.serviceRequest.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
