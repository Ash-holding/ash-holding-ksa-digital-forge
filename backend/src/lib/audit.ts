import { prisma } from "./prisma.js";
import type { Request } from "express";

export async function logAudit(
  req: Request,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.sub,
        action,
        entityType,
        entityId,
        metadata: metadata as never,
        ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
