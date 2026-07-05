import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { currentClientId, isStaff } from "../lib/scope.js";

export const filesRouter = Router();
filesRouter.use(requireAuth);

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(uploadRoot, { recursive: true });

const maxMb = Number(process.env.MAX_UPLOAD_MB || 25);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const day = new Date().toISOString().slice(0, 10);
    const dir = path.join(uploadRoot, day);
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
});

filesRouter.get("/", async (req, res) => {
  const where = isStaff(req)
    ? {}
    : { clientId: (await currentClientId(req)) ?? "__none__" };
  const files = await prisma.file.findMany({
    where,
    include: { uploader: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ files });
});

filesRouter.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const relPath = path.relative(uploadRoot, req.file.path).split(path.sep).join("/");
  const publicUrl = `/uploads/${relPath}`;

  let clientId = (req.body?.clientId as string | undefined) || undefined;
  const projectId = (req.body?.projectId as string | undefined) || undefined;

  if (!isStaff(req)) {
    clientId = (await currentClientId(req)) ?? undefined;
  }

  const file = await prisma.file.create({
    data: {
      clientId: clientId ?? null,
      projectId: projectId ?? null,
      uploadedBy: req.user!.sub,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: publicUrl,
    },
  });
  res.status(201).json({ file });
});

filesRouter.delete("/:id", async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file) return res.status(404).json({ error: "Not found" });
  if (!isStaff(req)) {
    const clientId = await currentClientId(req);
    if (file.clientId !== clientId && file.uploadedBy !== req.user!.sub) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const abs = path.join(uploadRoot, file.path.replace(/^\/uploads\//, ""));
  try {
    await fs.promises.unlink(abs);
  } catch {
    /* ignore missing disk file */
  }
  await prisma.file.delete({ where: { id: file.id } });
  res.json({ ok: true });
});
