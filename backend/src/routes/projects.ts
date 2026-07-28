import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";
import { WA } from "../lib/whatsapp.js";

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
  UNDER_REVIEW: "🔍 قيد المراجعة",
  APPROVED: "✅ تمت الموافقة",
  REJECTED: "❌ مرفوض",
  CONVERTED: "🚀 تم تحويله لمشروع رسمي",
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
// PROJECT REQUESTS  (client submits → admin reviews/approves)
// ============================================================

const REQUEST_STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "CONVERTED"] as const;
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
    const stats = {
      total: all.length,
      pending: all.filter((r) => r.status === "PENDING").length,
      underReview: all.filter((r) => r.status === "UNDER_REVIEW").length,
      approved: all.filter((r) => r.status === "APPROVED" || r.status === "CONVERTED").length,
      rejected: all.filter((r) => r.status === "REJECTED").length,
      urgent: all.filter((r) => r.priority === "URGENT" && r.status !== "REJECTED" && r.status !== "CONVERTED").length,
      last24h: all.filter((r) => now - new Date(r.createdAt).getTime() < 86400000).length,
    };
    res.json({ rows, total, page, pageSize, stats });
  } catch (e) { next(e); }
});

function emptyRequestStats() {
  return { total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0, urgent: 0, last24h: 0 };
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

// PATCH — staff updates status/note; APPROVED can auto-convert to project
projectsRouter.patch("/requests/:id", requireStaff, async (req, res, next) => {
  try {
    const body = z.object({
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
        status: finalStatus,
        adminNote: body.adminNote ?? existing.adminNote,
        projectId: projectId ?? undefined,
      },
      include: { client: { include: { user: { select: { name: true, email: true } } } } },
    });
    await logAudit(req, "project_request.update", "ProjectRequest", updated.id);

    // ---------- WhatsApp — notify client on status or admin-note change ----------
    const statusChanged = existing.status !== updated.status;
    const noteChanged = (existing.adminNote || "") !== (updated.adminNote || "") && !!updated.adminNote;
    if (statusChanged || noteChanged) {
      const phone = updated.contactPhone || (await clientPhone(updated.clientId));
      const lines = [`ASH HOLDING — تحديث على طلبك 📩`, `العنوان: ${updated.title}`];
      if (statusChanged) lines.push(`الحالة الجديدة: ${REQUEST_STATUS_LABEL[updated.status] || updated.status}`);
      if (noteChanged) lines.push(`ملاحظة الإدارة: ${updated.adminNote}`);
      if (updated.status === "CONVERTED") lines.push(`تم فتح مشروع رسمي — يمكنك متابعته من قسم "مشاريعي".`);
      lines.push(`للتفاصيل ادخل بوابة العميل.`);
      WA.notify(phone, lines.join("\n"), { kind: "project_request.status", entityId: updated.id });
    }

    res.json({ request: updated });
  } catch (e) { next(e); }
});


// DELETE — client can delete own PENDING; staff can delete any
projectsRouter.delete("/requests/:id", async (req, res, next) => {
  try {
    const existing = await prisma.projectRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (existing.clientId !== cid || existing.status !== "PENDING") {
        return res.status(403).json({ error: "لا يمكن حذف هذا الطلب" });
      }
    }
    await prisma.projectRequest.delete({ where: { id: req.params.id } });
    await logAudit(req, "project_request.delete", "ProjectRequest", req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
