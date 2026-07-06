import type { Request } from "express";
import { prisma } from "./prisma.js";

export async function currentClientId(req: Request): Promise<string | null> {
  if (!req.user) return null;
  const c = await prisma.client.findUnique({
    where: { userId: req.user.sub },
    select: { id: true },
  });
  return c?.id ?? null;
}

export function isStaff(req: Request): boolean {
  const r = req.user?.role;
  return r === "SUPER_ADMIN" || r === "ADMIN" || r === "SUPPORT" || r === "ACCOUNTANT";
}

export function isAdmin(req: Request): boolean {
  const r = req.user?.role;
  return r === "SUPER_ADMIN" || r === "ADMIN";
}

/** Paging helper: parses ?page=1&pageSize=20 */
export function paging(req: Request, defaultSize = 20) {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || defaultSize)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
