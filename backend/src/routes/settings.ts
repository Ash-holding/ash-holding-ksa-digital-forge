import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { logAudit } from "../lib/audit.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.systemSetting.findMany();
    const out: Record<string, unknown> = {};
    for (const r of rows) out[r.key] = r.value;
    res.json({ settings: out });
  } catch (e) { next(e); }
});

settingsRouter.put("/:key", requireAdmin, async (req, res, next) => {
  try {
    const { value } = z.object({ value: z.unknown() }).parse(req.body);
    const row = await prisma.systemSetting.upsert({
      where: { key: req.params.key },
      update: { value: value as never },
      create: { key: req.params.key, value: value as never },
    });
    await logAudit(req, "settings.update", "SystemSetting", row.id, { key: req.params.key });
    res.json({ setting: row });
  } catch (e) { next(e); }
});
