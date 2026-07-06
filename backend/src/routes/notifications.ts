import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { paging } from "../lib/scope.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = paging(req, 30);
    const [rows, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.sub },
        orderBy: { createdAt: "desc" }, skip, take,
      }),
      prisma.notification.count({ where: { userId: req.user!.sub } }),
      prisma.notification.count({ where: { userId: req.user!.sub, isRead: false } }),
    ]);
    res.json({ rows, total, unread, page, pageSize });
  } catch (e) { next(e); }
});

notificationsRouter.post("/:id/read", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.sub },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, isRead: false }, data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
