import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "بيانات غير صحيحة", details: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ error: "قيمة مكررة", meta: err.meta });
    if (err.code === "P2025") return res.status(404).json({ error: "السجل غير موجود" });
  }
  const msg = err instanceof Error ? err.message : "Internal server error";
  if (process.env.NODE_ENV !== "test") {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }
  res.status(500).json({ error: msg });
}
