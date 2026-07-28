// Attribution helpers: session ID, IP hashing, UA parsing, bot detection.
import crypto from "node:crypto";

const IP_SALT = process.env.IP_HASH_SALT || process.env.COOKIE_SECRET || "ash-holding-salt";

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex").slice(0, 32);
}

export function fingerprint(parts: Array<string | null | undefined>): string {
  return crypto
    .createHash("sha256")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex")
    .slice(0, 24);
}

export function newSessionId(): string {
  return crypto.randomBytes(18).toString("base64url");
}

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|monitor|headless|lighthouse|axios|curl|wget|python-requests|node-fetch/i;

export function isBotUA(ua: string | null | undefined): boolean {
  if (!ua) return true;
  return BOT_RE.test(ua);
}

export function parseUA(ua: string | null | undefined): {
  device: string; browser: string; os: string;
} {
  const s = (ua || "").toLowerCase();
  const device = /mobi|android|iphone|ipad/.test(s)
    ? /ipad|tablet/.test(s) ? "tablet" : "mobile"
    : "desktop";
  const browser =
    s.includes("edg/") ? "Edge" :
    s.includes("chrome/") ? "Chrome" :
    s.includes("safari/") ? "Safari" :
    s.includes("firefox/") ? "Firefox" : "Other";
  const os =
    s.includes("windows") ? "Windows" :
    s.includes("mac os") ? "macOS" :
    s.includes("android") ? "Android" :
    s.includes("iphone") || s.includes("ipad") ? "iOS" :
    s.includes("linux") ? "Linux" : "Other";
  return { device, browser, os };
}

export type UtmSet = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
};

export function pickUtm(q: Record<string, unknown>): UtmSet {
  const g = (k: string) => {
    const v = q[k];
    if (typeof v !== "string") return null;
    return v.slice(0, 120);
  };
  return {
    utmSource: g("utm_source"),
    utmMedium: g("utm_medium"),
    utmCampaign: g("utm_campaign"),
    utmContent: g("utm_content"),
  };
}
