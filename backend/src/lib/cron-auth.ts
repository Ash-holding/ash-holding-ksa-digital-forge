import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

/**
 * Timing-safe comparison of an incoming secret against an expected value.
 * Prevents remote timing attacks that could otherwise disclose the secret
 * byte-by-byte.
 */
export function safeEqualSecret(provided: string | undefined | null, expected: string | undefined | null): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Express middleware factory — requires `X-Cron-Secret` header to match
 * the given environment secret using a constant-time comparison.
 */
export function requireCronSecret(envVar: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env[envVar];
    const provided = req.header("x-cron-secret");
    if (!expected) return res.status(503).json({ error: "Cron secret not configured" });
    if (!safeEqualSecret(provided, expected)) return res.status(401).json({ error: "Invalid cron secret" });
    next();
  };
}
