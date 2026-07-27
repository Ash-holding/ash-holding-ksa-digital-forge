import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { logAudit } from "../lib/audit.js";
import { normalizeIp, lookupIp } from "../lib/geo.js";
import { WA } from "../lib/whatsapp.js";




export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

async function issueTokens(req: import("express").Request, user: { id: string; role: import("@prisma/client").UserRole; email: string }) {
  const access = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const { token: refresh, hash, expiresAt } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      userAgent: req.headers["user-agent"] || null,
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip || null,
    },
  });
  return { accessToken: access, refreshToken: refresh };
}

authRouter.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, include: { client: true } });
    if (!user || user.status !== "ACTIVE") return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

    const ip = normalizeIp((req.headers["x-forwarded-for"] as string) || req.ip || null);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastIpAddress: ip },
    });

    // Fire-and-forget: update client geo if applicable
    if (ip && user.client) {
      lookupIp(ip).then(async (geo) => {
        try {
          await prisma.client.update({
            where: { id: user.client!.id },
            data: {
              lastIpAddress: ip,
              lastSeenAt: new Date(),
              ...(geo ? {
                lastIpCountry: geo.countryCode,
                lastIpCity: geo.city,
                lastIpRegion: geo.region,
                lat: geo.lat ?? undefined,
                lng: geo.lng ?? undefined,
              } : {}),
            },
          });
        } catch { /* ignore */ }
      });
    } else if (user.client) {
      await prisma.client.update({ where: { id: user.client.id }, data: { lastSeenAt: new Date() } });
    }

    const tokens = await issueTokens(req, user);
    await logAudit(req, "auth.login", "User", user.id);
    // Login alert via WhatsApp (best-effort, non-blocking)
    const notifyPhone = user.phone || user.client?.phone || null;
    if (notifyPhone) {
      WA.notify(
        notifyPhone,
        `ASH HOLDING\nتم تسجيل الدخول لحسابك.\nالوقت: ${new Date().toLocaleString("ar-SA")}\nIP: ${ip ?? "غير معروف"}\nإذا لم يكن أنت، غيّر كلمة المرور فوراً.`,
        { userId: user.id, kind: "auth.login", entityId: user.id },
      );
    }
    return res.json({
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
    });
  } catch (e) { next(e); }
});


authRouter.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const hash = hashRefreshToken(refreshToken);
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hash }, include: { user: true } });
    if (!row || row.revokedAt || row.expiresAt < new Date() || !row.user || row.user.status !== "ACTIVE") {
      return res.status(401).json({ error: "Refresh token غير صالح" });
    }
    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    const tokens = await issueTokens(req, row.user);
    return res.json(tokens);
  } catch (e) { next(e); }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body ?? {});
    if (refreshToken) {
      const hash = hashRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revokedAt: new Date() } });
    } else if (req.user) {
      await prisma.refreshToken.updateMany({ where: { userId: req.user.sub, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await logAudit(req, "auth.logout", "User", req.user?.sub);
    return res.json({ ok: true });
  } catch (e) { next(e); }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: {
      id: true, email: true, name: true, role: true, phone: true, avatarUrl: true, status: true, lastLoginAt: true,
      client: { select: { id: true, companyName: true, city: true } },
    },
  });
  res.json({ user });
});

// Forgot password – placeholder (no email transport wired). Stores nothing; returns ok always.
authRouter.post("/forgot-password", authLimiter, async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "بريد غير صالح" });
  // TODO: integrate mail service to send reset link
  return res.json({ ok: true, message: "إذا كان البريد مسجلاً فسيصلك رابط إعادة التعيين." });
});
