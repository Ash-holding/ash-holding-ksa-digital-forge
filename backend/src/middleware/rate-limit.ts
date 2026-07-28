import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

export const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_WINDOW_MS || 60_000),
  max: Number(process.env.AUTH_RATE_LIMIT || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "عدد كبير من المحاولات، الرجاء المحاولة لاحقاً." },
});

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public affiliate click/attribution tracking — high volume, per IP.
export const trackLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.TRACK_RATE_LIMIT || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تجاوز معدل الطلبات المسموح." },
});

// Affiliate application submission — per IP + phone hash.
export const affiliateApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: Number(process.env.AFFILIATE_APPLY_RATE || 5),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const phone = String((req.body as { phone?: string })?.phone || "").replace(/\D/g, "").slice(-9);
    return `${ipKeyGenerator(req.ip ?? "0.0.0.0")}::${phone}`;
  },
  message: { error: "لقد تجاوزت الحد المسموح لطلبات التسجيل. حاول لاحقاً." },
});

// Wallet mutations (withdraw / deposit request) — per user.
export const walletActionLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.WALLET_RATE_LIMIT || 12),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as Request & { user?: { sub?: string } }).user?.sub || ipKeyGenerator(req.ip ?? "0.0.0.0"),
});
