import jwt, { type SignOptions } from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import crypto from "node:crypto";

const ACCESS_SECRET = process.env.JWT_SECRET || "dev-access-secret-change-me";
const ACCESS_TTL = (process.env.JWT_ACCESS_TTL || "15m") as SignOptions["expiresIn"];
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";
const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS || 30);

export type JwtPayload = { sub: string; role: UserRole; email: string };

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

// Refresh tokens are opaque random strings (stored hashed in DB).
export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(48).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Back-compat alias
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;
export { REFRESH_SECRET };
