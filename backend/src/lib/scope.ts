import type { Request } from "express";
import { prisma } from "./prisma.js";

/**
 * Resolve the Client row id for the authenticated user (CLIENT role).
 * Returns null if none.
 */
export async function currentClientId(req: Request): Promise<string | null> {
  if (!req.user) return null;
  const c = await prisma.client.findUnique({
    where: { userId: req.user.sub },
    select: { id: true },
  });
  return c?.id ?? null;
}

/**
 * True when the caller is admin/support/accountant staff.
 * Staff can read across all clients; a CLIENT is scoped to their own data.
 */
export function isStaff(req: Request): boolean {
  const r = req.user?.role;
  return r === "ADMIN" || r === "SUPPORT" || r === "ACCOUNTANT";
}
