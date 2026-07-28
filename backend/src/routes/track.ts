// Public affiliate tracking + attribution API.
// - POST /api/track/click         → record a click (via SPA tracker)
// - GET  /api/track/r/:slug       → server-side redirect + click record (share links)
// - GET  /api/track/resolve/:code → check code exists (for landing UI)
// - POST /api/track/attribute     → bind current session to a signed-up client
import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  hashIp, fingerprint, newSessionId, isBotUA, parseUA, pickUtm,
} from "../lib/attribution.js";
import { normalizeIp, lookupIp } from "../lib/geo.js";

export const trackRouter = Router();

const DEFAULT_COOKIE_DAYS = 30;
const DEFAULT_ATTRIBUTION: "LAST_CLICK" | "FIRST_CLICK" = "LAST_CLICK";
const REF_COOKIE = "ash_ref";
const SID_COOKIE = "ash_sid";

async function getSettings() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: ["affiliate.cookieDays", "affiliate.attributionModel"] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value] as const));
  const days =
    typeof map.get("affiliate.cookieDays") === "number"
      ? (map.get("affiliate.cookieDays") as number)
      : DEFAULT_COOKIE_DAYS;
  const modelVal = map.get("affiliate.attributionModel");
  const model =
    modelVal === "FIRST_CLICK" || modelVal === "LAST_CLICK"
      ? modelVal
      : DEFAULT_ATTRIBUTION;
  return { days, model };
}

async function findActiveAffiliate(code: string) {
  return prisma.affiliate.findFirst({
    where: { code: code.trim(), status: "ACTIVE" },
    select: { id: true, code: true, cookieDays: true },
  });
}

function ensureSessionId(req: Request, res: import("express").Response): string {
  const existing = (req.cookies?.[SID_COOKIE] as string | undefined) || null;
  if (existing && existing.length >= 12) return existing;
  const sid = newSessionId();
  res.cookie(SID_COOKIE, sid, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 365,
    path: "/",
  });
  return sid;
}

function setRefCookie(res: import("express").Response, code: string, days: number) {
  res.cookie(REF_COOKIE, code, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * days,
    path: "/",
  });
}

async function recordClick(opts: {
  affiliateId: string;
  linkId?: string | null;
  campaignId?: string | null;
  sessionId: string;
  ip: string | null;
  ua: string | null;
  referrer: string | null;
  landingPath: string | null;
  utm: ReturnType<typeof pickUtm>;
}) {
  const { device, browser, os } = parseUA(opts.ua);
  const ipHash = hashIp(opts.ip);
  const fp = fingerprint([ipHash, opts.ua, `${browser}|${os}|${device}`]);
  const bot = isBotUA(opts.ua);

  const previous = await prisma.affiliateClick.findFirst({
    where: { affiliateId: opts.affiliateId, fingerprint: fp },
    select: { id: true },
  });

  const geo = opts.ip ? await lookupIp(opts.ip).catch(() => null) : null;

  const click = await prisma.affiliateClick.create({
    data: {
      affiliateId: opts.affiliateId,
      linkId: opts.linkId ?? null,
      campaignId: opts.campaignId ?? null,
      sessionId: opts.sessionId,
      ipHash,
      country: geo?.countryCode ?? null,
      city: geo?.city ?? null,
      device, browser, os,
      referrer: opts.referrer?.slice(0, 500) ?? null,
      landingPath: opts.landingPath?.slice(0, 500) ?? null,
      utmSource: opts.utm.utmSource,
      utmMedium: opts.utm.utmMedium,
      utmCampaign: opts.utm.utmCampaign,
      utmContent: opts.utm.utmContent,
      fingerprint: fp,
      isBot: bot,
      isUnique: !previous,
    },
  });

  if (!bot && opts.linkId) {
    await prisma.affiliateLink.update({
      where: { id: opts.linkId },
      data: { totalClicks: { increment: 1 } },
    }).catch(() => null);
  }

  return click;
}

async function upsertAttribution(opts: {
  affiliateId: string;
  sessionId: string;
  linkId?: string | null;
  campaignId?: string | null;
  cookieDays: number;
  model: "LAST_CLICK" | "FIRST_CLICK";
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + opts.cookieDays * 86400_000);

  const existing = await prisma.affiliateAttribution.findUnique({
    where: {
      sessionId_affiliateId: { sessionId: opts.sessionId, affiliateId: opts.affiliateId },
    },
  });

  if (!existing) {
    await prisma.affiliateAttribution.create({
      data: {
        affiliateId: opts.affiliateId,
        sessionId: opts.sessionId,
        linkId: opts.linkId ?? null,
        campaignId: opts.campaignId ?? null,
        model: opts.model,
        firstClickAt: now,
        lastClickAt: now,
        expiresAt,
      },
    });
    return;
  }

  // Only refresh window for LAST_CLICK model; FIRST_CLICK keeps original.
  if (opts.model === "LAST_CLICK") {
    await prisma.affiliateAttribution.update({
      where: { id: existing.id },
      data: {
        lastClickAt: now,
        expiresAt,
        linkId: opts.linkId ?? existing.linkId,
        campaignId: opts.campaignId ?? existing.campaignId,
      },
    });
  } else {
    await prisma.affiliateAttribution.update({
      where: { id: existing.id },
      data: { lastClickAt: now },
    });
  }
}

// ---------- POST /api/track/click ----------
const clickSchema = z.object({
  ref: z.string().min(2).max(40),
  linkSlug: z.string().max(60).optional(),
  landing: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  utm: z
    .object({
      utm_source: z.string().max(120).optional(),
      utm_medium: z.string().max(120).optional(),
      utm_campaign: z.string().max(120).optional(),
      utm_content: z.string().max(120).optional(),
    })
    .partial()
    .optional(),
});

trackRouter.post("/click", async (req, res, next) => {
  try {
    const body = clickSchema.parse(req.body);
    const aff = await findActiveAffiliate(body.ref);
    if (!aff) return res.json({ ok: false, reason: "unknown_ref" });

    const settings = await getSettings();
    const cookieDays = aff.cookieDays ?? settings.days;
    const sessionId = ensureSessionId(req, res);
    setRefCookie(res, aff.code, cookieDays);

    let linkId: string | null = null;
    let campaignId: string | null = null;
    if (body.linkSlug) {
      const link = await prisma.affiliateLink.findUnique({
        where: { slug: body.linkSlug },
        select: { id: true, campaignId: true, affiliateId: true, isActive: true },
      });
      if (link && link.isActive && link.affiliateId === aff.id) {
        linkId = link.id;
        campaignId = link.campaignId;
      }
    }

    const ip = normalizeIp((req.headers["x-forwarded-for"] as string) || req.ip);
    const ua = req.headers["user-agent"] as string | undefined;
    const utm = pickUtm({ ...(body.utm || {}) } as Record<string, unknown>);

    const click = await recordClick({
      affiliateId: aff.id,
      linkId, campaignId,
      sessionId,
      ip, ua: ua ?? null,
      referrer: body.referrer ?? null,
      landingPath: body.landing ?? null,
      utm,
    });

    if (!click.isBot) {
      await upsertAttribution({
        affiliateId: aff.id, sessionId,
        linkId, campaignId,
        cookieDays,
        model: settings.model,
      });
    }

    res.json({ ok: true, sessionId, affiliate: aff.code, cookieDays });
  } catch (e) { next(e); }
});

// ---------- GET /api/track/r/:slug (server redirect) ----------
trackRouter.get("/r/:slug", async (req, res, next) => {
  try {
    const link = await prisma.affiliateLink.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true, isActive: true, landingPath: true, campaignId: true,
        affiliate: { select: { id: true, code: true, status: true, cookieDays: true } },
      },
    });
    const fallback = process.env.PUBLIC_SITE_URL || "/";
    if (!link || !link.isActive || link.affiliate.status !== "ACTIVE") {
      return res.redirect(302, fallback);
    }
    const settings = await getSettings();
    const cookieDays = link.affiliate.cookieDays ?? settings.days;
    const sessionId = ensureSessionId(req, res);
    setRefCookie(res, link.affiliate.code, cookieDays);

    const ip = normalizeIp((req.headers["x-forwarded-for"] as string) || req.ip);
    const ua = req.headers["user-agent"] as string | undefined;
    const utm = pickUtm(req.query as Record<string, unknown>);

    const click = await recordClick({
      affiliateId: link.affiliate.id,
      linkId: link.id,
      campaignId: link.campaignId,
      sessionId,
      ip, ua: ua ?? null,
      referrer: (req.headers.referer as string) || null,
      landingPath: link.landingPath,
      utm,
    });
    if (!click.isBot) {
      await upsertAttribution({
        affiliateId: link.affiliate.id, sessionId,
        linkId: link.id, campaignId: link.campaignId,
        cookieDays, model: settings.model,
      });
    }

    const target = new URL(link.landingPath || "/", process.env.PUBLIC_SITE_URL || "https://ash-holding.sa");
    target.searchParams.set("ref", link.affiliate.code);
    for (const [k, v] of Object.entries(utm)) {
      if (v) target.searchParams.set(k.replace(/([A-Z])/g, "_$1").toLowerCase(), v);
    }
    return res.redirect(302, target.toString());
  } catch (e) { next(e); }
});

// ---------- GET /api/track/resolve/:code ----------
trackRouter.get("/resolve/:code", async (req, res, next) => {
  try {
    const aff = await prisma.affiliate.findFirst({
      where: { code: req.params.code, status: "ACTIVE" },
      select: { code: true, displayName: true },
    });
    if (!aff) return res.status(404).json({ ok: false });
    res.json({ ok: true, affiliate: aff });
  } catch (e) { next(e); }
});

// ---------- POST /api/track/attribute (bind session → client) ----------
// Called right after a client signs up / logs in. Idempotent.
const attributeSchema = z.object({ clientId: z.string().min(3) });

trackRouter.post("/attribute", async (req, res, next) => {
  try {
    const { clientId } = attributeSchema.parse(req.body);
    const sessionId = (req.cookies?.[SID_COOKIE] as string | undefined) || null;
    const refCode = (req.cookies?.[REF_COOKIE] as string | undefined) || null;
    if (!sessionId || !refCode) return res.json({ ok: false, reason: "no_session" });

    const aff = await findActiveAffiliate(refCode);
    if (!aff) return res.json({ ok: false, reason: "unknown_ref" });

    const attr = await prisma.affiliateAttribution.findUnique({
      where: { sessionId_affiliateId: { sessionId, affiliateId: aff.id } },
    });
    if (!attr || attr.expiresAt < new Date()) {
      return res.json({ ok: false, reason: "expired" });
    }

    // Bind attribution to client (only if not already bound).
    if (!attr.clientId) {
      await prisma.affiliateAttribution.update({
        where: { id: attr.id },
        data: { clientId, convertedAt: new Date() },
      });
    }

    // Upsert AffiliateCustomer (one affiliate per client, first-wins).
    const existing = await prisma.affiliateCustomer.findUnique({ where: { clientId } });
    if (!existing) {
      await prisma.affiliateCustomer.create({
        data: { affiliateId: aff.id, clientId },
      });
    }

    res.json({ ok: true, affiliate: aff.code });
  } catch (e) { next(e); }
});
