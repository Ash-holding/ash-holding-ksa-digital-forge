import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

// Roles allowed inside the Financing admin surface.
export const FINANCING_ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "COMPLIANCE_OFFICER",
  "LEGAL_OFFICER",
  "CREDIT_MANAGER",
  "RISK_OFFICER",
  "CFO",
  "FINAL_APPROVER",
];

export const FINANCING_READ_ROLES: UserRole[] = [
  ...FINANCING_ADMIN_ROLES,
  "CREDIT_ANALYST",
  "COLLECTIONS_OFFICER",
  "CREDIT_COMMITTEE",
  "INTERNAL_AUDITOR",
  "FINANCE_REVIEWER",
  "ACCOUNTANT",
];

export function requireFinancingRole(...roles: UserRole[]) {
  const allowed = roles.length ? roles : FINANCING_ADMIN_ROLES;
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

/**
 * Blocks final/binding decisions unless the compliance officer has flipped
 * `financing_settings.productionEnabled=true` after uploading the required
 * legal approvals. Returns HTTP 423 (Locked) so the UI can display the
 * "sandbox" state distinctly from a permission error.
 */
export async function requireProductionEnabled(req: Request, res: Response, next: NextFunction) {
  const settings = await prisma.financingSetting.findUnique({ where: { id: "default" } });
  if (!settings?.productionEnabled) {
    return res.status(423).json({
      error: "financing_sandbox_locked",
      message:
        "بيئة تجريبية — لا يمكن تنفيذ هذا الإجراء قبل استكمال اعتمادات بوابة الامتثال.",
    });
  }
  next();
}

export async function logFinancingAudit(
  req: Request,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await prisma.financingAuditLog.create({
      data: {
        actorId: req.user?.sub,
        actorRole: req.user?.role,
        action,
        entityType,
        entityId,
        metadata: metadata as never,
        ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      },
    });
  } catch (e) {
    console.error("financing audit log failed", e);
  }
}
