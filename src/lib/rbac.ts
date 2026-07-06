import type { Role } from "./auth";

// Permissions per admin sub-path (matched by startsWith after /admin)
// Keys are the URL suffix after /admin (empty string = /admin index).
export const ADMIN_ROUTE_ROLES: Array<{ match: string; roles: Role[] }> = [
  { match: "/users", roles: ["SUPER_ADMIN"] },
  { match: "/settings", roles: ["SUPER_ADMIN"] },
  { match: "/audit-log", roles: ["SUPER_ADMIN", "ADMIN"] },
  { match: "/contracts", roles: ["SUPER_ADMIN", "ADMIN"] },
  { match: "/projects", roles: ["SUPER_ADMIN", "ADMIN"] },
  { match: "/services", roles: ["SUPER_ADMIN", "ADMIN"] },
  { match: "/clients", roles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"] },
  { match: "/files", roles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"] },
  { match: "/support", roles: ["SUPER_ADMIN", "ADMIN", "SUPPORT"] },
  { match: "/invoices", roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
  { match: "/payments", roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
  { match: "/reports", roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
  // /admin index — any staff role
  { match: "", roles: ["SUPER_ADMIN", "ADMIN", "SUPPORT", "ACCOUNTANT"] },
];

export const ALL_STAFF_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "ACCOUNTANT"];

export function isStaff(role?: Role | null): boolean {
  return !!role && role !== "CLIENT";
}

export function allowedForAdminPath(role: Role, pathname: string): boolean {
  const suffix = pathname.replace(/^\/admin/, "") || "";
  const rule = ADMIN_ROUTE_ROLES.find((r) => r.match !== "" && suffix.startsWith(r.match))
    ?? ADMIN_ROUTE_ROLES.find((r) => r.match === "")!;
  return rule.roles.includes(role);
}
