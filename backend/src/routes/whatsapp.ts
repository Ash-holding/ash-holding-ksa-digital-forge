import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { requireAuth } from "../middleware/auth.js";
import {
  WA,
  generateOtp,
  isWhatsAppConfigured,
  normalizePhone,
  sendWhatsAppText,
} from "../lib/whatsapp.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../lib/jwt.js";
import { logAudit } from "../lib/audit.js";
import { normalizeIp, lookupIp } from "../lib/geo.js";

export const whatsappRouter = Router();

const OTP_PURPOSES = ["login", "signup", "verify", "reset"] as const;
type OtpPurpose = (typeof OTP_PURPOSES)[number];

const OTP_TTL_MIN = 10;
const ADMIN_LOGIN_EMAIL = process.env.ADMIN_LOGIN_EMAIL || "ali6c201@gmail.com";
const ADMIN_LOGIN_PHONE = normalizePhone(process.env.ADMIN_LOGIN_PHONE || process.env.ADMIN_WHATSAPP || "0555812567");

/**
 * OTP is stored as a SystemSetting keyed by `otp:{purpose}:{phone}` to avoid
 * requiring a schema migration. Value = { hash, expiresAt, attempts, purpose }.
 */
type OtpRecord = {
  hash: string;
  expiresAt: string;
  attempts: number;
  purpose: OtpPurpose;
  meta?: Record<string, unknown>;
};

const memoryOtpStore = new Map<string, OtpRecord>();

function saveOtpInMemory(key: string, rec: OtpRecord) {
  memoryOtpStore.set(key, rec);
}

function loadOtpFromMemory(key: string): OtpRecord | null {
  const rec = memoryOtpStore.get(key);
  if (!rec) return null;
  if (new Date(rec.expiresAt).getTime() < Date.now()) {
    memoryOtpStore.delete(key);
    return null;
  }
  return rec;
}

function otpKey(purpose: OtpPurpose, phone: string) {
  return `otp:${purpose}:${phone}`;
}

function phoneVariants(normalized: string) {
  const variants = new Set([normalized, `+${normalized}`]);
  if (normalized.startsWith("966")) {
    variants.add(`0${normalized.slice(3)}`);
    variants.add(normalized.slice(3));
  }
  return [...variants];
}

async function findOtpUser(normalized: string) {
  const isAdminPhone = Boolean(ADMIN_LOGIN_PHONE && normalized === ADMIN_LOGIN_PHONE);
  if (isAdminPhone) {
    const adminByEmail = await prisma.user.findUnique({ where: { email: ADMIN_LOGIN_EMAIL }, include: { client: true } });
    const admin = adminByEmail ?? await prisma.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
      orderBy: { createdAt: "asc" },
      include: { client: true },
    });
    if (admin) {
      return prisma.user.update({
        where: { id: admin.id },
        data: {
          phone: normalized,
          role: admin.email === ADMIN_LOGIN_EMAIL ? "SUPER_ADMIN" : admin.role,
          status: "ACTIVE",
        },
        include: { client: true },
      });
    }
    return null;
  }

  const variants = phoneVariants(normalized);
  return prisma.user.findFirst({
    where: { OR: [{ phone: { in: variants } }, { client: { phone: { in: variants } } }] },
    include: { client: true },
  });
}

async function upsertAdminFromOtp(normalized: string, name?: string) {
  const passwordHash = await bcrypt.hash(generateOtp(16), 10);
  return prisma.user.upsert({
    where: { email: ADMIN_LOGIN_EMAIL },
    update: {
      phone: normalized,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    create: {
      email: ADMIN_LOGIN_EMAIL,
      passwordHash,
      name: name || "علي صالح الشهري",
      phone: normalized,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    include: { client: true },
  });
}

async function recordOtpLogin(req: import("express").Request, user: { id: string; client?: { id: string } | null }) {
  const ip = normalizeIp((req.headers["x-forwarded-for"] as string) || req.ip || null);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastIpAddress: ip } });
  if (!user.client) return;
  if (!ip) {
    await prisma.client.update({ where: { id: user.client.id }, data: { lastSeenAt: new Date() } });
    return;
  }
  const clientId = user.client.id;
  lookupIp(ip).then(async (geo) => {
    try {
      await prisma.client.update({
        where: { id: clientId },
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
}

async function saveOtp(purpose: OtpPurpose, phone: string, rec: OtpRecord) {
  const key = otpKey(purpose, phone);
  saveOtpInMemory(key, rec);
  try {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: rec as never },
      create: { key, value: rec as never },
    });
  } catch (error) {
    console.warn("[otp] database storage unavailable; using encrypted in-memory OTP fallback", error);
  }
}

async function loadOtp(purpose: OtpPurpose, phone: string): Promise<OtpRecord | null> {
  const key = otpKey(purpose, phone);
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return (row?.value as unknown as OtpRecord) || loadOtpFromMemory(key);
  } catch (error) {
    console.warn("[otp] database read unavailable; using in-memory OTP fallback", error);
    return loadOtpFromMemory(key);
  }
}

async function clearOtp(purpose: OtpPurpose, phone: string) {
  const key = otpKey(purpose, phone);
  memoryOtpStore.delete(key);
  try {
    await prisma.systemSetting.deleteMany({ where: { key } });
  } catch (error) {
    console.warn("[otp] database cleanup unavailable", error);
  }
}

// --------------------------------------------------------------------------
// POST /api/whatsapp/otp/request { phone, purpose? }
// --------------------------------------------------------------------------
whatsappRouter.post("/otp/request", authLimiter, async (req, res, next) => {
  try {
    const { phone, purpose } = z
      .object({
        phone: z.string().min(6),
        purpose: z.enum(OTP_PURPOSES).optional(),
      })
      .parse(req.body);
    const normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ error: "رقم الهاتف غير صالح" });
    if (!isWhatsAppConfigured()) {
      return res.status(503).json({ error: "خدمة الواتساب غير مفعّلة على الخادم" });
    }
    const kind: OtpPurpose = purpose ?? "login";
    const code = generateOtp(6);
    const hash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString();
    await saveOtp(kind, normalized, { hash, expiresAt, attempts: 0, purpose: kind });

    const message =
      `ASH HOLDING\n` +
      `رمز التحقق: ${code}\n` +
      `صالح لمدة ${OTP_TTL_MIN} دقائق.\n` +
      `لا تشارك هذا الرمز مع أي شخص.`;
    const result = await sendWhatsAppText(normalized, message, {
      kind: `otp.${kind}`,
      entityId: normalized,
    });
    if (!result.ok) {
      return res.status(502).json({ error: "تعذّر إرسال الرمز عبر الواتساب" });
    }
    await logAudit(req, `whatsapp.otp.${kind}.request`, "Otp", normalized);
    return res.json({ ok: true, expiresInSec: OTP_TTL_MIN * 60 });
  } catch (e) {
    next(e);
  }
});

// --------------------------------------------------------------------------
// POST /api/whatsapp/otp/verify { phone, code, purpose? }
// Logs the user in (or bootstraps a CLIENT account if none exists).
// --------------------------------------------------------------------------
whatsappRouter.post("/otp/verify", authLimiter, async (req, res, next) => {
  try {
    const { phone, code, purpose, name } = z
      .object({
        phone: z.string().min(6),
        code: z.string().regex(/^\d{4,8}$/),
        purpose: z.enum(OTP_PURPOSES).optional(),
        name: z.string().min(2).optional(),
      })
      .parse(req.body);
    const normalized = normalizePhone(phone);
    if (!normalized) return res.status(400).json({ error: "رقم الهاتف غير صالح" });
    const kind: OtpPurpose = purpose ?? "login";
    const rec = await loadOtp(kind, normalized);
    if (!rec) return res.status(400).json({ error: "لا يوجد رمز نشط لهذا الرقم" });
    if (new Date(rec.expiresAt).getTime() < Date.now()) {
      await clearOtp(kind, normalized);
      return res.status(400).json({ error: "انتهت صلاحية الرمز" });
    }
    if (rec.attempts >= 5) {
      await clearOtp(kind, normalized);
      return res.status(429).json({ error: "تجاوزت الحد المسموح، اطلب رمزاً جديداً" });
    }
    const ok = await bcrypt.compare(code, rec.hash);
    if (!ok) {
      await saveOtp(kind, normalized, { ...rec, attempts: rec.attempts + 1 });
      return res.status(400).json({ error: "الرمز غير صحيح" });
    }
    await clearOtp(kind, normalized);

    // Find by normalized phone variants. The configured admin WhatsApp number
    // always resolves to the admin account, even if an old client row exists
    // with the same phone or the admin phone was stored as +966/05 format.
    let user = await findOtpUser(normalized);
    if (!user) {
      if (ADMIN_LOGIN_PHONE && normalized === ADMIN_LOGIN_PHONE) {
        user = await upsertAdminFromOtp(normalized, name);
      }
    }
    if (!user) {
      if (kind !== "signup") {
        return res.status(404).json({ error: "لا يوجد حساب مرتبط بهذا الرقم" });
      }
      const passwordHash = await bcrypt.hash(generateOtp(16), 10);
      user = await prisma.user.create({
        data: {
          email: `wa_${normalized}@ashholding.sa`,
          passwordHash,
          name: name || `عميل ${normalized.slice(-4)}`,
          phone: normalized,
          role: "CLIENT",
          client: { create: { phone: normalized } },
        },
        include: { client: true },
      });
    }

    const access = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const { token: refresh, hash: rHash, expiresAt } = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: rHash,
        expiresAt,
        userAgent: req.headers["user-agent"] || null,
        ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip || null,
      },
    });
    await recordOtpLogin(req, user);
    await logAudit(req, `whatsapp.otp.${kind}.verify`, "User", user.id);

    // Welcome/notification message
    void WA.send(
      normalized,
      kind === "signup"
        ? `أهلاً بك في ASH HOLDING 🎉\nتم إنشاء حسابك بنجاح. يمكنك تسجيل الدخول الآن عبر: ${process.env.PUBLIC_APP_URL || ""}`
        : `تم تسجيل الدخول لحسابك في ASH HOLDING.\nإذا لم يكن أنت، تواصل معنا فوراً.`,
      { userId: user.id, kind: "auth" },
    );

    return res.json({
      accessToken: access,
      refreshToken: refresh,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, avatarUrl: user.avatarUrl },
    });
  } catch (e) {
    next(e);
  }
});

// --------------------------------------------------------------------------
// POST /api/whatsapp/send  (staff only) — quick manual message
// --------------------------------------------------------------------------
whatsappRouter.post("/send", requireAuth, async (req, res, next) => {
  try {
    if (!req.user || req.user.role === "CLIENT") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { phone, message } = z
      .object({ phone: z.string().min(6), message: z.string().min(1).max(4000) })
      .parse(req.body);
    const r = await sendWhatsAppText(phone, message, { userId: req.user.sub, kind: "manual" });
    if (!r.ok) return res.status(502).json({ error: "تعذّر الإرسال", details: r.body });
    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// --------------------------------------------------------------------------
// GET /api/whatsapp/status
// --------------------------------------------------------------------------
whatsappRouter.get("/status", requireAuth, (_req, res) => {
  res.json({ configured: isWhatsAppConfigured() });
});

// --------------------------------------------------------------------------
// POST /api/whatsapp/webhook  — inbound events from SmartWats
// Register this URL in SmartWats set_webhook.
// --------------------------------------------------------------------------
whatsappRouter.post("/webhook", async (req, res) => {
  try {
    await prisma.auditLog.create({
      data: {
        action: "whatsapp.webhook",
        entityType: "WhatsApp",
        metadata: (req.body ?? {}) as never,
      },
    });
  } catch { /* ignore */ }
  res.json({ ok: true });
});
