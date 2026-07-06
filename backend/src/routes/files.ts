import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { currentClientId, isStaff, paging } from "../lib/scope.js";
import { logAudit } from "../lib/audit.js";

export const filesRouter = Router();
filesRouter.use(requireAuth);

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(uploadRoot, { recursive: true });

const maxMb = Number(process.env.UPLOAD_MAX_MB || 25);
const allowedMimes = new Set(
  (process.env.UPLOAD_ALLOWED_MIME ||
    "image/png,image/jpeg,image/webp,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ).split(",").map((s) => s.trim()).filter(Boolean),
);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const d = new Date();
    const dir = path.join(uploadRoot, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, "0"));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const id = crypto.randomBytes(12).toString("hex");
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.size === 0 || allowedMimes.has(file.mimetype)) return cb(null, true);
    cb(new Error("نوع الملف غير مسموح به"));
  },
});

filesRouter.get("/", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req);
    let where: import("@prisma/client").Prisma.FileWhereInput = {};
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (!cid) return res.json({ rows: [], total: 0, page, pageSize });
      where.clientId = cid;
    } else {
      if (req.query.clientId) where.clientId = req.query.clientId as string;
      if (req.query.projectId) where.projectId = req.query.projectId as string;
    }
    const [rows, total] = await Promise.all([
      prisma.file.findMany({
        where,
        include: {
          uploader: { select: { name: true, role: true } },
          project: { select: { title: true } },
          contract: { select: { contractNumber: true } },
        },
        orderBy: { createdAt: "desc" }, skip, take,
      }),
      prisma.file.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
  } catch (e) { next(e); }
});

filesRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "لم يتم إرسال ملف" });
    const relPath = path.relative(uploadRoot, req.file.path).split(path.sep).join("/");
    const publicUrl = `/uploads/${relPath}`;

    let clientId = (req.body?.clientId as string | undefined) || undefined;
    const projectId = (req.body?.projectId as string | undefined) || undefined;
    const ticketId = (req.body?.ticketId as string | undefined) || undefined;
    const contractId = (req.body?.contractId as string | undefined) || undefined;

    if (!isStaff(req)) clientId = (await currentClientId(req)) ?? undefined;

    const file = await prisma.file.create({
      data: {
        clientId: clientId ?? null,
        projectId: projectId ?? null,
        ticketId: ticketId ?? null,
        contractId: contractId ?? null,
        uploadedById: req.user!.sub,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: publicUrl,
      },
    });
    await logAudit(req, "file.upload", "File", file.id, { originalName: file.originalName });
    res.status(201).json({ file });
  } catch (e) { next(e); }
});

filesRouter.delete("/:id", async (req, res, next) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: "غير موجود" });
    if (!isStaff(req)) {
      const cid = await currentClientId(req);
      if (file.clientId !== cid && file.uploadedById !== req.user!.sub) return res.status(403).json({ error: "Forbidden" });
    }
    const abs = path.join(uploadRoot, file.path.replace(/^\/uploads\//, ""));
    try { await fs.promises.unlink(abs); } catch { /* ignore */ }
    await prisma.file.delete({ where: { id: file.id } });
    await logAudit(req, "file.delete", "File", file.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
