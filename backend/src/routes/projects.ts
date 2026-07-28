import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";
import { WA, generateOtp, normalizePhone } from "../lib/whatsapp.js";

// ---------- WhatsApp helpers ----------
async function clientPhone(clientId: string): Promise<string | null> {
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: { select: { phone: true, name: true } } },
  });
  return c?.phone || c?.user?.phone || null;
}

function adminPhones(): string[] {
  const raw = process.env.ADMIN_WHATSAPP || process.env.ADMIN_PHONE || "";
  return raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
}

function notifyAdmins(message: string, meta?: { kind?: string; entityId?: string }): void {
  for (const p of adminPhones()) WA.notify(p, message, meta);
}

const REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "⏳ قيد الانتظار",
  UNDER_REVIEW: "🔍 قيد الدراسة",
  PROPOSAL_SENT: "📤 عرض مُرسَل",
  CLIENT_REVISION: "✍️ طلب تعديل",
  AWAITING_SIGNATURE: "🖋️ بانتظار التوقيع",
  SIGNED: "✅ موقّع رقمياً",
  IN_PROGRESS: "🚧 قيد التنفيذ",
  DELIVERED: "📦 تم التسليم",
  APPROVED: "👍 تمت الموافقة",
  REJECTED: "❌ مرفوض",
  CONVERTED: "🚀 تم تحويله لمشروع رسمي",
  COMPLETED: "🏁 مكتمل",
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
  NEW: "🆕 جديد",
  PLANNING: "🗂️ تخطيط",
  DESIGN: "🎨 تصميم",
  DEVELOPMENT: "💻 تطوير",
  WAITING_CLIENT: "⏸️ بانتظار العميل",
  TESTING: "🧪 اختبار",
  COMPLETED: "✅ مكتمل",
  ON_HOLD: "⏳ متوقف مؤقتاً",
};

const CATEGORY_LABEL: Record<string, string> = {
  WEBSITE: "🌐 موقع إلكتروني",
  MOBILE_APP: "📱 تطبيق جوال",
  ADMIN_SYSTEM: "🗄️ نظام إداري",
  HOSTING: "☁️ استضافة",
  VPS: "🖥️ خادم VPS",
  DEDICATED_SERVER: "🖥️ خادم مخصص",
  SMTP: "✉️ خدمة SMTP",
  MARKETING: "📣 تسويق رقمي",
  DESIGN: "🎨 تصميم وهوية",
  SUPPORT: "🛠️ دعم وصيانة",
  OTHER: "📌 طلب مخصص",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "🟢 منخفضة",
  NORMAL: "🔵 عادية",
  HIGH: "🟠 عالية",
  URGENT: "🔴 عاجلة",
};

// Short human reference from UUID: REQ-XXXXXX / PRJ-XXXXXX
function shortRef(prefix: string, id: string): string {
  return `${prefix}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function fmtMoney(n: unknown): string {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return "—";
  return `${v.toLocaleString("en-US")} ر.س`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA-u-ca-gregory", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return String(d); }
}

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━";
const SIGNATURE = "\n\n🏢 *ASH HOLDING* — آش القابضة\n🌐 ash-holding.sa";

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
        client: { include: { user: { select: { name: true, email: true, phone: true } } } },
        notes: { include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" } },
        files: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" }, include: { items: true } },
        contracts: { orderBy: { createdAt: "desc" } },
        services: true,
      },
    });
    if (!project) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (project.clientId !== cid) return res.status(403).json({ error: "Forbidden" });
      project.notes = project.notes.filter((n) => n.visibility !== "INTERNAL");
    }
    const linkedRequest = await prisma.projectRequest.findFirst({
      where: { projectId: req.params.id },
      select: {
        id: true, title: true, category: true, priority: true, status: true,
        budgetMin: true, budgetMax: true, targetDate: true, createdAt: true,
        contactName: true, contactPhone: true, adminNote: true,
      },
    });
    const requestRef = linkedRequest ? shortRef("REQ", linkedRequest.id) : null;
    const projectRef = shortRef("PRJ", project.id);
    res.json({ project, linkedRequest, requestRef, projectRef });
  } catch (e) { next(e); }
});

// Quick invoice from a project — staff only
projectsRouter.post("/:id/invoice", requireStaff, async (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(2).optional(),
      description: z.string().max(500).optional().nullable(),
      amount: z.coerce.number().positive("المبلغ مطلوب"),
      taxRate: z.coerce.number().min(0).max(100).default(15),
      dueAt: z.coerce.date().optional().nullable(),
      notes: z.string().max(1000).optional().nullable(),
    }).parse(req.body);

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      select: { id: true, clientId: true, title: true },
    });
    if (!project) return res.status(404).json({ error: "المشروع غير موجود" });

    const requestLink = await prisma.projectRequest.findFirst({
      where: { projectId: project.id },
      select: { id: true },
    });
    const projectRef = shortRef("PRJ", project.id);
    const requestRef = requestLink ? shortRef("REQ", requestLink.id) : null;

    // Generate invoice number
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({ where: { invoiceNumber: { startsWith: `INV-${year}-` } } });
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;

    const subtotal = body.amount;
    const taxAmount = +(subtotal * (body.taxRate / 100)).toFixed(2);
    const total = +(subtotal + taxAmount).toFixed(2);
    const notesRef = [
      requestRef ? `مرجع الطلب: ${requestRef}` : null,
      `مرجع المشروع: ${projectRef}`,
      body.notes,
    ].filter(Boolean).join("\n");

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: project.clientId,
        projectId: project.id,
        status: "UNPAID",
        subtotal, discount: 0, taxRate: body.taxRate, taxAmount, total,
        dueAt: body.dueAt ?? null,
        notes: notesRef,
        items: {
          create: [{
            title: body.title || project.title,
            description: body.description ?? null,
            quantity: 1, unitPrice: subtotal, total: subtotal,
          }],
        },
      },
      include: { items: true },
    });
    await logAudit(req, "invoice.create_from_project", "Invoice", invoice.id);

    const phone = await clientPhone(project.clientId);
    WA.notify(
      phone,
      [
        `🧾 *فاتورة جديدة*`,
        DIVIDER,
        `🔖 *رقم الفاتورة:* ${invoice.invoiceNumber}`,
        requestRef ? `📌 *رقم الطلب:* ${requestRef}` : "",
        `📁 *المشروع:* ${project.title} (${projectRef})`,
        `💰 *الإجمالي:* ${fmtMoney(invoice.total)}`,
        body.dueAt ? `⏰ *الاستحقاق:* ${fmtDate(body.dueAt)}` : "",
        DIVIDER,
        `يمكنك مراجعتها من بوابة العميل.${SIGNATURE}`,
      ].filter(Boolean).join("\n"),
      { kind: "invoice.create", entityId: invoice.id },
    );

    res.status(201).json({ invoice });
  } catch (e) { next(e); }
});


projectsRouter.post("/", requireStaff, async (req, res, next) => {
  try {
    const data = projectSchema.parse(req.body);
    if (!data.clientId) return res.status(400).json({ error: "clientId مطلوب" });
    const created = await prisma.project.create({ data: data as never });
    await logAudit(req, "project.create", "Project", created.id);
    const ref = shortRef("PRJ", created.id);
    const phone = await clientPhone(created.clientId);
    WA.notify(
      phone,
      [
        `🎉 *مشروع جديد بانتظارك*`,
        DIVIDER,
        `🔖 *الرقم المرجعي:* ${ref}`,
        `📁 *المشروع:* ${created.title}`,
        `📊 *الحالة:* ${PROJECT_STATUS_LABEL[created.status] || created.status}`,
        `📅 *تاريخ الفتح:* ${fmtDate(created.createdAt)}`,
        created.dueDate ? `⏰ *التسليم المتوقع:* ${fmtDate(created.dueDate)}` : "",
        created.budget ? `💰 *الميزانية:* ${fmtMoney(created.budget)}` : "",
        DIVIDER,
        `يمكنك متابعة كل التفاصيل من بوابة العميل الرسمية.${SIGNATURE}`,
      ].filter(Boolean).join("\n"),
      { kind: "project.create", entityId: created.id },
    );
    res.status(201).json({ project: created });
  } catch (e) { next(e); }
});

projectsRouter.patch("/:id", requireStaff, async (req, res, next) => {
  try {
    const data = projectSchema.partial().parse(req.body);
    const before = await prisma.project.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.project.update({ where: { id: req.params.id }, data: data as never });
    await logAudit(req, "project.update", "Project", updated.id);
    const changes: string[] = [];
    if (before && before.status !== updated.status) {
      changes.push(`📊 *الحالة الجديدة:* ${PROJECT_STATUS_LABEL[updated.status] || updated.status}`);
    }
    if (before && before.progress !== updated.progress) {
      changes.push(`📈 *نسبة الإنجاز:* ${updated.progress}%`);
    }
    if (before && (before.dueDate?.getTime() ?? 0) !== (updated.dueDate?.getTime() ?? 0) && updated.dueDate) {
      changes.push(`⏰ *تاريخ التسليم:* ${fmtDate(updated.dueDate)}`);
    }
    if (changes.length) {
      const ref = shortRef("PRJ", updated.id);
      const phone = await clientPhone(updated.clientId);
      WA.notify(
        phone,
        [
          `🛠️ *تحديث على مشروعك*`,
          DIVIDER,
          `🔖 *الرقم المرجعي:* ${ref}`,
          `📁 *المشروع:* ${updated.title}`,
          ...changes,
          DIVIDER,
          `للاطلاع على التفاصيل الكاملة، تفضل بزيارة بوابة العميل.${SIGNATURE}`,
        ].join("\n"),
        { kind: "project.update", entityId: updated.id },
      );
    }
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

// ============================================================
// PROJECT STAGES  (admin defines phases, clients follow progress)
// ============================================================
const STAGE_STATUSES = ["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "SKIPPED"] as const;
const STAGE_STATUS_LABEL: Record<string, string> = {
  PENDING: "⏳ لم تبدأ",
  IN_PROGRESS: "🚧 قيد التنفيذ",
  BLOCKED: "🚫 متوقفة",
  DONE: "✅ مكتملة",
  SKIPPED: "⏭️ تم تجاوزها",
};

const stageSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(STAGE_STATUSES).optional(),
  progress: z.number().min(0).max(100).optional(),
  weight: z.number().min(1).max(100).optional(),
  orderIndex: z.number().optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

async function assertProjectAccess(req: import("express").Request, projectId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, clientId: true, title: true } });
  if (!p) return { ok: false as const, status: 404, error: "المشروع غير موجود" };
  if (!isStaff(req)) {
    const cid = await currentClientId(req);
    if (p.clientId !== cid) return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, project: p };
}

async function recomputeProjectProgress(projectId: string) {
  const stages = await prisma.projectStage.findMany({ where: { projectId }, select: { progress: true, weight: true, status: true } });
  if (!stages.length) return;
  const active = stages.filter((s) => s.status !== "SKIPPED");
  if (!active.length) return;
  const totalW = active.reduce((a, s) => a + (s.weight || 1), 0);
  const done = active.reduce((a, s) => a + (s.progress || 0) * (s.weight || 1), 0);
  const overall = Math.round(done / totalW);
  await prisma.project.update({ where: { id: projectId }, data: { progress: overall } });
}

// LIST stages
projectsRouter.get("/:id/stages", async (req, res, next) => {
  try {
    const acc = await assertProjectAccess(req, req.params.id);
    if (!acc.ok) return res.status(acc.status).json({ error: acc.error });
    const rows = await prisma.projectStage.findMany({
      where: { projectId: req.params.id },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });
    res.json({ rows });
  } catch (e) { next(e); }
});

// CREATE stage — staff only
projectsRouter.post("/:id/stages", requireStaff, async (req, res, next) => {
  try {
    const data = stageSchema.parse(req.body);
    const count = await prisma.projectStage.count({ where: { projectId: req.params.id } });
    const created = await prisma.projectStage.create({
      data: {
        projectId: req.params.id,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "PENDING",
        progress: data.progress ?? 0,
        weight: data.weight ?? 1,
        orderIndex: data.orderIndex ?? count,
        dueDate: data.dueDate ?? null,
      },
    });
    await logAudit(req, "project_stage.create", "ProjectStage", created.id);
    await recomputeProjectProgress(req.params.id);
    res.status(201).json({ stage: created });
  } catch (e) { next(e); }
});

// UPDATE stage — staff only
projectsRouter.patch("/:id/stages/:stageId", requireStaff, async (req, res, next) => {
  try {
    const data = stageSchema.partial().parse(req.body);
    const before = await prisma.projectStage.findUnique({ where: { id: req.params.stageId } });
    if (!before || before.projectId !== req.params.id) return res.status(404).json({ error: "غير موجود" });

    const patch: Record<string, unknown> = { ...data };
    if (data.status === "IN_PROGRESS" && !before.startedAt) patch.startedAt = new Date();
    if (data.status === "DONE") {
      patch.completedAt = new Date();
      if (data.progress === undefined) patch.progress = 100;
    }

    const updated = await prisma.projectStage.update({ where: { id: req.params.stageId }, data: patch as never });
    await logAudit(req, "project_stage.update", "ProjectStage", updated.id);
    await recomputeProjectProgress(req.params.id);

    // Notify client on status change
    if (before.status !== updated.status) {
      const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: { clientId: true, title: true } });
      if (project) {
        const phone = await clientPhone(project.clientId);
        WA.notify(
          phone,
          [
            `📌 *تحديث مرحلة مشروع*`,
            DIVIDER,
            `📁 *المشروع:* ${project.title}`,
            `🧩 *المرحلة:* ${updated.title}`,
            `📊 *الحالة الجديدة:* ${STAGE_STATUS_LABEL[updated.status] || updated.status}`,
            `📈 *نسبة إنجاز المرحلة:* ${updated.progress}%`,
            DIVIDER,
            `تابع التفاصيل من بوابة العميل.${SIGNATURE}`,
          ].join("\n"),
          { kind: "project_stage.update", entityId: updated.id },
        );
      }
    }
    res.json({ stage: updated });
  } catch (e) { next(e); }
});

// DELETE stage — staff only
projectsRouter.delete("/:id/stages/:stageId", requireStaff, async (req, res, next) => {
  try {
    const s = await prisma.projectStage.findUnique({ where: { id: req.params.stageId } });
    if (!s || s.projectId !== req.params.id) return res.status(404).json({ error: "غير موجود" });
    await prisma.projectStage.delete({ where: { id: req.params.stageId } });
    await logAudit(req, "project_stage.delete", "ProjectStage", req.params.stageId);
    await recomputeProjectProgress(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// REORDER stages — staff only
projectsRouter.post("/:id/stages/reorder", requireStaff, async (req, res, next) => {
  try {
    const body = z.object({ order: z.array(z.string()).min(1) }).parse(req.body);
    await Promise.all(body.order.map((sid, idx) =>
      prisma.projectStage.updateMany({ where: { id: sid, projectId: req.params.id }, data: { orderIndex: idx } })
    ));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ============================================================
// PROJECT MESSAGES (in-project chat between client and admin)
// ============================================================
projectsRouter.get("/:id/messages", async (req, res, next) => {
  try {
    const acc = await assertProjectAccess(req, req.params.id);
    if (!acc.ok) return res.status(acc.status).json({ error: acc.error });

    const where: import("@prisma/client").Prisma.ProjectMessageWhereInput = { projectId: req.params.id };
    if (!isStaff(req)) where.isInternal = false;

    const rows = await prisma.projectMessage.findMany({
      where,
      include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
      take: 500,
    });

    // Mark as read
    if (isStaff(req)) {
      await prisma.projectMessage.updateMany({
        where: { projectId: req.params.id, readByStaff: false, isInternal: false },
        data: { readByStaff: true },
      }).catch(() => null);
    } else {
      await prisma.projectMessage.updateMany({
        where: { projectId: req.params.id, readByClient: false, isInternal: false },
        data: { readByClient: true },
      }).catch(() => null);
    }
    res.json({ rows });
  } catch (e) { next(e); }
});

projectsRouter.post("/:id/messages", async (req, res, next) => {
  try {
    const acc = await assertProjectAccess(req, req.params.id);
    if (!acc.ok) return res.status(acc.status).json({ error: acc.error });

    const body = z.object({
      content: z.string().min(1).max(4000),
      isInternal: z.boolean().optional(),
      attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional().nullable(),
    }).parse(req.body);

    if (body.isInternal && !isStaff(req)) return res.status(403).json({ error: "Forbidden" });

    const staff = isStaff(req);
    const created = await prisma.projectMessage.create({
      data: {
        projectId: req.params.id,
        authorId: req.user!.sub,
        content: body.content,
        attachments: (body.attachments as never) ?? undefined,
        isInternal: body.isInternal ?? false,
        readByStaff: staff,
        readByClient: !staff,
      },
      include: { author: { select: { id: true, name: true, role: true, avatarUrl: true } } },
    });
    await logAudit(req, "project_message.create", "ProjectMessage", created.id);

    // WhatsApp notify counterparty (skip internal notes)
    if (!created.isInternal) {
      const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: { clientId: true, title: true } });
      if (project) {
        const preview = created.content.length > 200 ? created.content.slice(0, 200) + "…" : created.content;
        if (staff) {
          const phone = await clientPhone(project.clientId);
          WA.notify(
            phone,
            [
              `💬 *رسالة جديدة من فريق ASH HOLDING*`,
              DIVIDER,
              `📁 *المشروع:* ${project.title}`,
              `👤 *المرسل:* ${created.author.name}`,
              DIVIDER,
              preview,
              DIVIDER,
              `📌 للرد، افتح بوابة العميل → المشروع.${SIGNATURE}`,
            ].join("\n"),
            { kind: "project_message.staff", entityId: created.id },
          );
        } else {
          notifyAdmins(
            [
              `💬 *رسالة جديدة من العميل داخل المشروع*`,
              DIVIDER,
              `📁 *المشروع:* ${project.title}`,
              `👤 *العميل:* ${created.author.name}`,
              DIVIDER,
              preview,
              DIVIDER,
              `📌 افتح لوحة الإدارة للرد.${SIGNATURE}`,
            ].join("\n"),
            { kind: "project_message.client", entityId: created.id },
          );
        }
      }
    }
    res.status(201).json({ message: created });
  } catch (e) { next(e); }
});

projectsRouter.delete("/:id/messages/:messageId", requireStaff, async (req, res, next) => {
  try {
    await prisma.projectMessage.delete({ where: { id: req.params.messageId } });
    await logAudit(req, "project_message.delete", "ProjectMessage", req.params.messageId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ============================================================
// PROJECT REQUESTS  (client submits → admin reviews/approves)
// ============================================================

const REQUEST_STATUSES = [
  "PENDING","UNDER_REVIEW","PROPOSAL_SENT","CLIENT_REVISION",
  "AWAITING_SIGNATURE","SIGNED","IN_PROGRESS","DELIVERED",
  "APPROVED","REJECTED","CONVERTED","COMPLETED",
] as const;
const REQUEST_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const REQUEST_CATEGORIES = [
  "WEBSITE","MOBILE_APP","ADMIN_SYSTEM","HOSTING","VPS","DEDICATED_SERVER",
  "SMTP","MARKETING","DESIGN","SUPPORT","OTHER",
] as const;

const projectRequestSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().min(3, "العنوان قصير جداً").max(160),
  description: z.string().max(4000).optional().nullable(),
  category: z.enum(REQUEST_CATEGORIES).default("OTHER"),
  priority: z.enum(REQUEST_PRIORITIES).default("NORMAL"),
  budgetMin: z.coerce.number().nonnegative().optional().nullable(),
  budgetMax: z.coerce.number().nonnegative().optional().nullable(),
  targetDate: z.coerce.date().optional().nullable(),
  contactName: z.string().max(120).optional().nullable(),
  contactPhone: z.string().max(40).optional().nullable(),
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional().nullable(),
});

// LIST
projectsRouter.get("/requests/list", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    const status = req.query.status as string | undefined;
    const q = String(req.query.q || "").trim();

    let where: import("@prisma/client").Prisma.ProjectRequestWhereInput = {};
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize, stats: emptyRequestStats() });
      where.clientId = cid;
    }
    if (status && (REQUEST_STATUSES as readonly string[]).includes(status)) where.status = status as never;
    if (q) where.title = { contains: q, mode: "insensitive" };

    const [rows, total, all] = await Promise.all([
      prisma.projectRequest.findMany({
        where,
        include: { client: { include: { user: { select: { name: true, email: true } } } } },
        orderBy: { createdAt: "desc" },
        skip, take,
      }),
      prisma.projectRequest.count({ where }),
      prisma.projectRequest.findMany({
        where: isStaff(req) ? {} : where,
        select: { status: true, createdAt: true, priority: true },
      }),
    ]);

    const now = Date.now();
    const inFlight = ["PROPOSAL_SENT","CLIENT_REVISION","AWAITING_SIGNATURE"];
    const running = ["SIGNED","IN_PROGRESS","DELIVERED"];
    const stats = {
      total: all.length,
      pending: all.filter((r) => r.status === "PENDING").length,
      underReview: all.filter((r) => r.status === "UNDER_REVIEW").length,
      proposal: all.filter((r) => inFlight.includes(r.status)).length,
      running: all.filter((r) => running.includes(r.status)).length,
      approved: all.filter((r) => ["APPROVED","CONVERTED","COMPLETED"].includes(r.status)).length,
      rejected: all.filter((r) => r.status === "REJECTED").length,
      urgent: all.filter((r) => r.priority === "URGENT" && !["REJECTED","CONVERTED","COMPLETED"].includes(r.status)).length,
      last24h: all.filter((r) => now - new Date(r.createdAt).getTime() < 86400000).length,
    };
    res.json({ rows, total, page, pageSize, stats });
  } catch (e) { next(e); }
});

function emptyRequestStats() {
  return { total: 0, pending: 0, underReview: 0, proposal: 0, running: 0, approved: 0, rejected: 0, urgent: 0, last24h: 0 };
}

// CREATE
projectsRouter.post("/requests", async (req, res, next) => {
  try {
    const data = projectRequestSchema.parse(req.body);
    let clientId = data.clientId;
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.status(403).json({ error: "لا يوجد ملف عميل مرتبط" });
      clientId = cid;
    }
    if (!clientId) return res.status(400).json({ error: "clientId مطلوب" });

    const created = await prisma.projectRequest.create({
      data: {
        clientId,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        priority: data.priority,
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        targetDate: data.targetDate ?? null,
        contactName: data.contactName ?? null,
        contactPhone: data.contactPhone ?? null,
        attachments: (data.attachments as never) ?? undefined,
      },
      include: { client: { include: { user: { select: { name: true, email: true } } } } },
    });
    await logAudit(req, "project_request.create", "ProjectRequest", created.id);

    // ---------- WhatsApp notifications ----------
    const ref = shortRef("REQ", created.id);
    const clientName = created.client?.user?.name || created.contactName || "عميل";
    const clientEmail = created.client?.user?.email || "—";
    const clientContact = created.contactPhone || (await clientPhone(created.clientId));
    const budgetLine =
      created.budgetMin || created.budgetMax
        ? `${fmtMoney(created.budgetMin)} – ${fmtMoney(created.budgetMax)}`
        : "—";
    const shortDesc = created.description
      ? (created.description.length > 220 ? created.description.slice(0, 220) + "…" : created.description)
      : "—";

    // → notify admins (full detail)
    notifyAdmins(
      [
        `🆕 *طلب مشروع جديد*`,
        DIVIDER,
        `🔖 *رقم الطلب:* ${ref}`,
        `👤 *العميل:* ${clientName}`,
        `📧 *البريد:* ${clientEmail}`,
        clientContact ? `📱 *الجوال:* ${clientContact}` : "",
        DIVIDER,
        `📁 *العنوان:* ${created.title}`,
        `🏷️ *التصنيف:* ${CATEGORY_LABEL[created.category] || created.category}`,
        `⚡ *الأولوية:* ${PRIORITY_LABEL[created.priority] || created.priority}`,
        `📊 *الحالة:* ${REQUEST_STATUS_LABEL[created.status] || created.status}`,
        `💰 *الميزانية:* ${budgetLine}`,
        created.targetDate ? `⏰ *التاريخ المستهدف:* ${fmtDate(created.targetDate)}` : "",
        `📅 *تاريخ الإرسال:* ${fmtDate(created.createdAt)}`,
        DIVIDER,
        `📝 *الوصف:*\n${shortDesc}`,
        DIVIDER,
        `👉 يُرجى مراجعة الطلب من لوحة الإدارة والرد خلال 24 ساعة عمل.${SIGNATURE}`,
      ].filter(Boolean).join("\n"),
      { kind: "project_request.new", entityId: created.id },
    );

    // → confirm to client (official receipt)
    WA.notify(
      clientContact,
      [
        `✅ *تم استلام طلبك بنجاح*`,
        `عزيزنا العميل، شكراً لثقتك بـ *ASH HOLDING*.`,
        DIVIDER,
        `🔖 *رقم الطلب:* ${ref}`,
        `📁 *العنوان:* ${created.title}`,
        `🏷️ *التصنيف:* ${CATEGORY_LABEL[created.category] || created.category}`,
        `⚡ *الأولوية:* ${PRIORITY_LABEL[created.priority] || created.priority}`,
        `📊 *الحالة الحالية:* ${REQUEST_STATUS_LABEL[created.status] || created.status}`,
        `💰 *الميزانية المقترحة:* ${budgetLine}`,
        created.targetDate ? `⏰ *التاريخ المستهدف:* ${fmtDate(created.targetDate)}` : "",
        `📅 *تاريخ الاستلام:* ${fmtDate(created.createdAt)}`,
        DIVIDER,
        `سيقوم فريقنا المختص بمراجعة طلبك والرد عليك خلال *24 ساعة عمل*.`,
        `يمكنك متابعة حالة الطلب أولاً بأول من *بوابة العميل*.`,
        `\n⚠️ يرجى الاحتفاظ بالرقم المرجعي للطلب لأي استفسار مستقبلي.${SIGNATURE}`,
      ].filter(Boolean).join("\n"),
      { kind: "project_request.created", entityId: created.id },
    );

    res.status(201).json({ request: created });
  } catch (e) { next(e); }
});

// GET single request
async function ensureInvoiceForSignedRequest(requestId: string) {
  const r = await prisma.projectRequest.findUnique({ where: { id: requestId } });
  if (!r) return null;
  if (r.status !== "SIGNED" && r.status !== "IN_PROGRESS" && r.status !== "DELIVERED" && r.status !== "COMPLETED") return null;
  if (r.linkedInvoiceId) {
    const exists = await prisma.invoice.findUnique({ where: { id: r.linkedInvoiceId }, select: { id: true } });
    if (exists) return r.linkedInvoiceId;
  }
  if (!r.proposalAmount) return null;

  const now = new Date();
  const year = now.getFullYear();
  const count = await prisma.invoice.count({ where: { invoiceNumber: { startsWith: `INV-${year}-` } } });
  const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
  const subtotal = Number(r.proposalAmount);
  const taxRate = 15;
  const taxAmount = +(subtotal * (taxRate / 100)).toFixed(2);
  const total = +(subtotal + taxAmount).toFixed(2);
  const ref = shortRef("REQ", r.id);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId: r.clientId,
      status: "UNPAID",
      subtotal, discount: 0, taxRate, taxAmount, total,
      dueAt: new Date(Date.now() + 7 * 86400000),
      notes: `فاتورة تلقائية لطلب ${ref} — ${r.title}`,
      items: { create: [{ title: r.title, description: r.proposalScope ?? null, quantity: 1, unitPrice: subtotal, total: subtotal }] },
    },
  });
  await prisma.projectRequest.update({ where: { id: r.id }, data: { linkedInvoiceId: invoice.id } });
  console.log("[invoice.backfill] created", invoice.invoiceNumber, "for request", ref);
  return invoice.id;
}

projectsRouter.get("/requests/:id", async (req, res, next) => {
  try {
    let r = await prisma.projectRequest.findUnique({
      where: { id: req.params.id },
      include: {
        client: { include: { user: { select: { name: true, email: true, phone: true } } } },
      },
    });
    if (!r) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (r.clientId !== cid) return res.status(403).json({ error: "ممنوع" });
    }
    // Auto-heal: if signed but no invoice was created (legacy path), create it now.
    try {
      const invId = await ensureInvoiceForSignedRequest(r.id);
      if (invId && invId !== r.linkedInvoiceId) {
        r = await prisma.projectRequest.findUnique({
          where: { id: req.params.id },
          include: { client: { include: { user: { select: { name: true, email: true, phone: true } } } } },
        }) as typeof r;
      }
    } catch (e) { console.error("[ensureInvoice]", e); }

    const project = r!.projectId
      ? await prisma.project.findUnique({
          where: { id: r!.projectId },
          select: { id: true, title: true, status: true, progress: true },
        })
      : null;
    res.json({ request: { ...r, project }, ref: shortRef("REQ", r!.id) });
  } catch (e) { next(e); }
});


// PATCH — staff updates any field; APPROVED can auto-convert to project
projectsRouter.patch("/requests/:id", requireStaff, async (req, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(3).max(160).optional(),
      description: z.string().max(4000).optional().nullable(),
      category: z.enum(REQUEST_CATEGORIES).optional(),
      priority: z.enum(REQUEST_PRIORITIES).optional(),
      budgetMin: z.coerce.number().nonnegative().optional().nullable(),
      budgetMax: z.coerce.number().nonnegative().optional().nullable(),
      targetDate: z.coerce.date().optional().nullable(),
      contactName: z.string().max(120).optional().nullable(),
      contactPhone: z.string().max(40).optional().nullable(),
      status: z.enum(REQUEST_STATUSES).optional(),
      adminNote: z.string().max(2000).optional().nullable(),
      convertToProject: z.boolean().optional(),
      projectBudget: z.coerce.number().optional().nullable(),
    }).parse(req.body);


    const existing = await prisma.projectRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "غير موجود" });

    let projectId = existing.projectId;
    let finalStatus = body.status ?? existing.status;

    if (body.convertToProject && !projectId) {
      const project = await prisma.project.create({
        data: {
          clientId: existing.clientId,
          title: existing.title,
          description: existing.description ?? undefined,
          status: "PLANNING",
          progress: 0,
          budget: body.projectBudget ?? existing.budgetMax ?? existing.budgetMin ?? undefined,
          dueDate: existing.targetDate ?? undefined,
        },
      });
      projectId = project.id;
      finalStatus = "CONVERTED";
      await logAudit(req, "project.create_from_request", "Project", project.id);
    }

    const updated = await prisma.projectRequest.update({
      where: { id: req.params.id },
      data: {
        title: body.title ?? existing.title,
        description: body.description !== undefined ? body.description : existing.description,
        category: body.category ?? existing.category,
        priority: body.priority ?? existing.priority,
        budgetMin: body.budgetMin !== undefined ? body.budgetMin : existing.budgetMin,
        budgetMax: body.budgetMax !== undefined ? body.budgetMax : existing.budgetMax,
        targetDate: body.targetDate !== undefined ? body.targetDate : existing.targetDate,
        contactName: body.contactName !== undefined ? body.contactName : existing.contactName,
        contactPhone: body.contactPhone !== undefined ? body.contactPhone : existing.contactPhone,
        status: finalStatus,
        adminNote: body.adminNote !== undefined ? body.adminNote : existing.adminNote,
        projectId: projectId ?? undefined,
      },
      include: { client: { include: { user: { select: { name: true, email: true } } } } },
    });

    await logAudit(req, "project_request.update", "ProjectRequest", updated.id);

    // ---------- WhatsApp — notify client on status or admin-note change ----------
    const statusChanged = existing.status !== updated.status;
    const noteChanged = (existing.adminNote || "") !== (updated.adminNote || "") && !!updated.adminNote;
    if (statusChanged || noteChanged) {
      const ref = shortRef("REQ", updated.id);
      const phone = updated.contactPhone || (await clientPhone(updated.clientId));
      const lines: string[] = [
        `📩 *تحديث رسمي على طلبك*`,
        DIVIDER,
        `🔖 *رقم الطلب:* ${ref}`,
        `📁 *العنوان:* ${updated.title}`,
      ];
      if (statusChanged) lines.push(`📊 *الحالة الجديدة:* ${REQUEST_STATUS_LABEL[updated.status] || updated.status}`);
      if (noteChanged) lines.push(DIVIDER, `📝 *ملاحظة الإدارة:*\n${updated.adminNote}`);
      if (updated.status === "CONVERTED") {
        lines.push(DIVIDER, `🚀 *تم فتح مشروع رسمي* بناءً على هذا الطلب.`, `يمكنك متابعته من قسم *"مشاريعي"* في بوابة العميل.`);
      } else if (updated.status === "APPROVED") {
        lines.push(DIVIDER, `✅ تمت *الموافقة المبدئية* على طلبك، وسيتواصل معك فريقنا لاستكمال التفاصيل.`);
      } else if (updated.status === "REJECTED") {
        lines.push(DIVIDER, `❌ نأسف لإبلاغك بأن الطلب *غير مقبول* حالياً. يمكنك التواصل معنا لمزيد من التوضيح.`);
      }
      lines.push(DIVIDER, `للاطلاع على التفاصيل الكاملة، تفضل بزيارة بوابة العميل.${SIGNATURE}`);
      WA.notify(phone, lines.join("\n"), { kind: "project_request.status", entityId: updated.id });
    }

    res.json({ request: updated });
  } catch (e) { next(e); }
});


// DELETE — STAFF ONLY (clients cannot delete requests to preserve audit trail)
projectsRouter.delete("/requests/:id", requireStaff, async (req, res, next) => {
  try {
    const existing = await prisma.projectRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "غير موجود" });
    await prisma.projectRequest.delete({ where: { id: req.params.id } });
    await logAudit(req, "project_request.delete", "ProjectRequest", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ============================================================
// APPROVAL WORKFLOW  (proposal → revision → signature → invoice → execution)
// ============================================================
const REQ_CLIENT_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PROPOSAL_SENT: ["CLIENT_REVISION", "AWAITING_SIGNATURE"],
  AWAITING_SIGNATURE: ["SIGNED"],
};

async function assertRequestAccess(req: import("express").Request, id: string) {
  const r = await prisma.projectRequest.findUnique({
    where: { id },
    include: { client: { include: { user: { select: { name: true, email: true, phone: true } } } } },
  });
  if (!r) return { ok: false as const, status: 404, error: "الطلب غير موجود" };
  if (!isStaff(req)) {
    const cid = await currentClientId(req);
    if (r.clientId !== cid) return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, request: r };
}

async function logRequestEvent(req: import("express").Request, requestId: string, from: string, to: string, note?: string, meta?: Record<string, unknown>) {
  await logAudit(req, `project_request.transition.${to.toLowerCase()}`, "ProjectRequest", requestId, {
    from, to, note: note || null, ...(meta || {}),
  });
}

// ---------- GET timeline (from AuditLog) ----------
projectsRouter.get("/requests/:id/timeline", async (req, res, next) => {
  try {
    const acc = await assertRequestAccess(req, req.params.id);
    if (!acc.ok) return res.status(acc.status).json({ error: acc.error });
    const rows = await prisma.auditLog.findMany({
      where: { entityType: "ProjectRequest", entityId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, role: true } } },
      take: 200,
    });
    res.json({ rows });
  } catch (e) { next(e); }
});

// ---------- ADMIN: submit / update a proposal ----------
projectsRouter.post("/requests/:id/proposal", requireStaff, async (req, res, next) => {
  try {
    const body = z.object({
      amount: z.coerce.number().positive("المبلغ مطلوب"),
      scope: z.string().min(10, "اذكر نطاق العمل"),
      durationDays: z.coerce.number().int().min(1).max(3650),
      validUntil: z.coerce.date().optional().nullable(),
      note: z.string().max(2000).optional().nullable(),
    }).parse(req.body);

    const acc = await assertRequestAccess(req, req.params.id);
    if (!acc.ok) return res.status(acc.status).json({ error: acc.error });
    if (["SIGNED","IN_PROGRESS","DELIVERED","COMPLETED","REJECTED"].includes(acc.request.status)) {
      return res.status(400).json({ error: "لا يمكن تعديل العرض في هذه المرحلة" });
    }

    const from = acc.request.status;
    const updated = await prisma.projectRequest.update({
      where: { id: req.params.id },
      data: {
        proposalAmount: body.amount,
        proposalScope: body.scope,
        proposalDuration: body.durationDays,
        proposalValidUntil: body.validUntil ?? null,
        proposalSentAt: new Date(),
        adminNote: body.note ?? acc.request.adminNote,
        status: "PROPOSAL_SENT",
      },
    });
    await logRequestEvent(req, updated.id, from, "PROPOSAL_SENT", body.note ?? undefined, { amount: body.amount, durationDays: body.durationDays });

    const ref = shortRef("REQ", updated.id);
    const phone = acc.request.contactPhone || acc.request.client?.phone || acc.request.client?.user?.phone || null;
    WA.notify(
      phone,
      [
        `📤 *عرض جديد لطلبك*`,
        DIVIDER,
        `🔖 *رقم الطلب:* ${ref}`,
        `📁 *العنوان:* ${updated.title}`,
        `💰 *قيمة العرض:* ${fmtMoney(body.amount)}`,
        `⏱️ *المدة المقترحة:* ${body.durationDays} يوم`,
        body.validUntil ? `📅 *صالح حتى:* ${fmtDate(body.validUntil)}` : "",
        DIVIDER,
        `يرجى مراجعة العرض في بوابة العميل والرد بالموافقة أو طلب تعديل.${SIGNATURE}`,
      ].filter(Boolean).join("\n"),
      { kind: "request.proposal", entityId: updated.id },
    );
    res.json({ request: updated });
  } catch (e) { next(e); }
});

// ---------- CLIENT: request revision ----------
projectsRouter.post("/requests/:id/revise", async (req, res, next) => {
  try {
    if (isStaff(req)) return res.status(400).json({ error: "هذا الإجراء للعميل" });
    const body = z.object({ note: z.string().min(5, "اذكر التعديلات المطلوبة").max(2000) }).parse(req.body);
    const acc = await assertRequestAccess(req, req.params.id);
    if (!acc.ok) return res.status(acc.status).json({ error: acc.error });
    if (acc.request.status !== "PROPOSAL_SENT") return res.status(400).json({ error: "لا يوجد عرض قيد المراجعة" });

    const updated = await prisma.projectRequest.update({
      where: { id: req.params.id },
      data: {
        status: "CLIENT_REVISION",
        revisionCount: { increment: 1 },
        revisionRequest: body.note,
      },
    });
    await logRequestEvent(req, updated.id, "PROPOSAL_SENT", "CLIENT_REVISION", body.note);

    notifyAdmins(
      [
        `✍️ *طلب تعديل من العميل*`,
        DIVIDER,
        `🔖 *الطلب:* ${shortRef("REQ", updated.id)}`,
        `📁 ${updated.title}`,
        DIVIDER,
        `📝 *الملاحظات:*\n${body.note}`,
        DIVIDER,
        `افتح الطلب في لوحة الإدارة لإرسال عرض معدّل.${SIGNATURE}`,
      ].join("\n"),
      { kind: "request.revision", entityId: updated.id },
    );
    res.json({ request: updated });
  } catch (e) { next(e); }
});

// ---------- ADMIN: request final signature (sends OTP to client) ----------
async function saveSignatureOtp(requestId: string, otp: string) {
  const key = `sigotp:${requestId}`;
  const hash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: { hash, expiresAt } as never },
    create: { key, value: { hash, expiresAt } as never },
  });
}
async function verifySignatureOtp(requestId: string, otp: string) {
  const key = `sigotp:${requestId}`;
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return false;
  const rec = row.value as unknown as { hash: string; expiresAt: string };
  if (!rec || new Date(rec.expiresAt).getTime() < Date.now()) return false;
  const hash = crypto.createHash("sha256").update(otp).digest("hex");
  const ok = hash === rec.hash;
  if (ok) await prisma.systemSetting.deleteMany({ where: { key } }).catch(() => {});
  return ok;
}

projectsRouter.post("/requests/:id/request-signature", async (req, res, next) => {
  try {
    const acc = await assertRequestAccess(req, req.params.id);
    if (!acc.ok) return res.status(acc.status).json({ error: acc.error });
    if (!acc.request.proposalAmount) return res.status(400).json({ error: "لا يوجد عرض مُرسَل" });
    if (!["PROPOSAL_SENT", "AWAITING_SIGNATURE", "CLIENT_REVISION"].includes(acc.request.status)) {
      return res.status(400).json({ error: "لا يمكن طلب التوقيع في هذه المرحلة" });
    }


    const otp = generateOtp(6);
    await saveSignatureOtp(acc.request.id, otp);
    const updated = await prisma.projectRequest.update({
      where: { id: req.params.id },
      data: { status: "AWAITING_SIGNATURE" },
    });
    await logRequestEvent(req, updated.id, acc.request.status, "AWAITING_SIGNATURE");

    const phone = normalizePhone(acc.request.contactPhone || acc.request.client?.phone || acc.request.client?.user?.phone || "");
    if (phone) {
      WA.notify(
        phone,
        [
          `🖋️ *رمز التوقيع الرقمي*`,
          DIVIDER,
          `🔖 *الطلب:* ${shortRef("REQ", updated.id)}`,
          `📁 ${updated.title}`,
          `🔐 *رمز التحقق:* *${otp}*`,
          `⏱️ صالح لمدة 15 دقيقة.`,
          DIVIDER,
          `أدخل الرمز في صفحة الطلب لتوثيق موافقتك النهائية.${SIGNATURE}`,
        ].join("\n"),
        { kind: "request.sig_otp", entityId: updated.id },
      );
    }
    res.json({ request: updated, sent: Boolean(phone) });
  } catch (e) { next(e); }
});

// ---------- CLIENT: verify OTP & sign ----------
projectsRouter.post("/requests/:id/sign", async (req, res, next) => {
  try {
    if (isStaff(req)) return res.status(400).json({ error: "هذا الإجراء للعميل" });
    const body = z.object({
      otp: z.string().length(6),
      agreed: z.literal(true, { errorMap: () => ({ message: "يجب الموافقة على الشروط" }) }),
    }).parse(req.body);

    const acc = await assertRequestAccess(req, req.params.id);
    if (!acc.ok) return res.status(acc.status).json({ error: acc.error });
    if (acc.request.status !== "AWAITING_SIGNATURE") return res.status(400).json({ error: "الطلب ليس بانتظار التوقيع" });
    if (!acc.request.proposalAmount) return res.status(400).json({ error: "لا يوجد عرض للتوقيع عليه" });

    const ok = await verifySignatureOtp(acc.request.id, body.otp);
    if (!ok) return res.status(400).json({ error: "الرمز غير صحيح أو منتهي" });

    const now = new Date();
    const ip = ((req.headers["x-forwarded-for"] as string) || req.ip || "").split(",")[0].trim() || null;
    const ua = (req.headers["user-agent"] as string) || null;
    const hashBase = `${acc.request.id}|${req.user!.sub}|${body.otp}|${now.toISOString()}`;
    const signatureHash = crypto.createHash("sha256").update(hashBase).digest("hex");

    // ---- Create invoice tied to this request ----
    const year = now.getFullYear();
    const count = await prisma.invoice.count({ where: { invoiceNumber: { startsWith: `INV-${year}-` } } });
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
    const subtotal = Number(acc.request.proposalAmount);
    const taxRate = 15;
    const taxAmount = +(subtotal * (taxRate / 100)).toFixed(2);
    const total = +(subtotal + taxAmount).toFixed(2);
    const ref = shortRef("REQ", acc.request.id);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: acc.request.clientId,
        status: "UNPAID",
        subtotal, discount: 0, taxRate, taxAmount, total,
        dueAt: new Date(Date.now() + 7 * 86400000),
        notes: `فاتورة تلقائية لطلب ${ref} — ${acc.request.title}`,
        items: {
          create: [{
            title: acc.request.title,
            description: acc.request.proposalScope ?? null,
            quantity: 1, unitPrice: subtotal, total: subtotal,
          }],
        },
      },
    });

    const updated = await prisma.projectRequest.update({
      where: { id: req.params.id },
      data: {
        status: "SIGNED",
        signedAt: now,
        signatureHash,
        signatureIp: ip,
        signatureUserAgent: ua ? ua.slice(0, 300) : null,
        linkedInvoiceId: invoice.id,
      },
    });
    await logRequestEvent(req, updated.id, "AWAITING_SIGNATURE", "SIGNED", "توقيع رقمي معتمد", { ip, invoiceNumber });

    const phone = acc.request.contactPhone || acc.request.client?.phone || acc.request.client?.user?.phone || null;
    WA.notify(
      phone,
      [
        `✅ *تم توثيق موافقتك رسمياً*`,
        DIVIDER,
        `🔖 *الطلب:* ${ref}`,
        `📁 ${updated.title}`,
        `🧾 *الفاتورة:* ${invoiceNumber}`,
        `💰 *الإجمالي:* ${fmtMoney(total)} (شامل الضريبة)`,
        `⏰ *الاستحقاق:* خلال 7 أيام`,
        DIVIDER,
        `بعد السداد سيتم تحويل الطلب تلقائياً إلى قيد التنفيذ وبدء العدّاد الزمني.${SIGNATURE}`,
      ].join("\n"),
      { kind: "request.signed", entityId: updated.id },
    );
    notifyAdmins(
      [
        `🖋️ *توقيع رقمي جديد*`,
        DIVIDER,
        `🔖 ${ref} — ${updated.title}`,
        `👤 العميل: ${acc.request.client?.user?.name || "—"}`,
        `🧾 صدرت الفاتورة ${invoiceNumber} بقيمة ${fmtMoney(total)}.`,
        DIVIDER,
        `IP: ${ip || "—"}`,
      ].join("\n"),
      { kind: "request.signed.admin", entityId: updated.id },
    );

    res.json({ request: updated, invoice });
  } catch (e) { next(e); }
});

// ---------- HOOK: called by invoice mark-paid to move request to IN_PROGRESS ----------
export async function activateRequestIfInvoicePaid(invoiceId: string) {
  const request = await prisma.projectRequest.findFirst({ where: { linkedInvoiceId: invoiceId } });
  if (!request || request.status !== "SIGNED") return null;
  const start = new Date();
  const days = request.proposalDuration || 30;
  const due = new Date(start.getTime() + days * 86400000);

  // Create official project if not linked
  let projectId = request.projectId;
  if (!projectId) {
    const p = await prisma.project.create({
      data: {
        clientId: request.clientId,
        title: request.title,
        description: request.description ?? request.proposalScope ?? undefined,
        status: "DEVELOPMENT",
        progress: 0,
        budget: request.proposalAmount ?? undefined,
        startDate: start,
        dueDate: due,
      },
    });
    projectId = p.id;
  } else {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "DEVELOPMENT", startDate: start, dueDate: due, budget: request.proposalAmount ?? undefined },
    }).catch(() => null);
  }

  const updated = await prisma.projectRequest.update({
    where: { id: request.id },
    data: { status: "IN_PROGRESS", executionStartAt: start, executionDueAt: due, projectId },
  });

  // ---- Auto-generate signed contract ----
  const clientRow = await prisma.client.findUnique({
    where: { id: request.clientId },
    include: { user: { select: { phone: true, name: true } } },
  });
  const ref = shortRef("REQ", request.id);
  const existingContract = await prisma.contract.findFirst({ where: { projectId } });
  let contract = existingContract;
  if (!existingContract) {
    const y = start.getFullYear();
    const ctrCount = await prisma.contract.count({ where: { contractNumber: { startsWith: `CTR-${y}-` } } });
    const contractNumber = `CTR-${y}-${String(ctrCount + 1).padStart(4, "0")}`;
    contract = await prisma.contract.create({
      data: {
        contractNumber,
        clientId: request.clientId,
        projectId,
        title: request.title,
        status: "SIGNED",
        value: request.proposalAmount ?? undefined,
        currency: "SAR",
        startDate: start,
        endDate: due,
        signedAt: request.signedAt ?? new Date(),
        notes: [
          `عقد رسمي مُعتمد ومُوقّع رقمياً بناءً على الطلب ${ref}.`,
          `نطاق العمل: ${request.proposalScope ?? request.description ?? "—"}`,
          request.signatureHash ? `بصمة التوقيع: ${request.signatureHash}` : "",
          request.signatureIp ? `IP: ${request.signatureIp}` : "",
        ].filter(Boolean).join("\n"),
      },
    });
  }

  const phone = request.contactPhone || clientRow?.phone || clientRow?.user?.phone || null;
  WA.notify(
    phone,
    [
      `🚀 *مشروعك دخل مرحلة التنفيذ*`,
      DIVIDER,
      `🔖 *الطلب:* ${ref}`,
      `📁 ${updated.title}`,
      `📅 *بدء التنفيذ:* ${fmtDate(start)}`,
      `⏰ *التسليم المتوقع:* ${fmtDate(due)} (${days} يوم)`,
      contract ? `📄 *العقد الرسمي:* ${contract.contractNumber} — متاح للتحميل من بوابتك.` : "",
      DIVIDER,
      `يمكنك تحميل العقد ومتابعة المراحل من بوابة العميل.${SIGNATURE}`,
    ].filter(Boolean).join("\n"),
    { kind: "request.in_progress", entityId: updated.id },
  );

  return updated;
}

