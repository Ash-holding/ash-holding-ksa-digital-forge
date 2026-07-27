/**
 * SmartWats WhatsApp API integration
 * Docs: https://docs.smartwats.com/
 */
import { prisma } from "./prisma.js";

const BASE_URL = process.env.SMARTWATS_BASE_URL || "https://app.smartwats.com/api";
const INSTANCE_ID = process.env.SMARTWATS_INSTANCE_ID || "";
const ACCESS_TOKEN = process.env.SMARTWATS_ACCESS_TOKEN || "";
const DEFAULT_CC = process.env.WHATSAPP_DEFAULT_CC || "966"; // Saudi Arabia

export function isWhatsAppConfigured(): boolean {
  return Boolean(INSTANCE_ID && ACCESS_TOKEN);
}

/** Normalize KSA-style numbers: "0555…" → "966555…", "+966…" → "966…" */
export function normalizePhone(input?: string | null): string | null {
  if (!input) return null;
  let p = String(input).replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = DEFAULT_CC + p.slice(1);
  if (/^5\d{8}$/.test(p)) p = DEFAULT_CC + p;
  return /^\d{8,15}$/.test(p) ? p : null;
}

type SendResult = { ok: boolean; status: number; body?: unknown; error?: string };

export async function sendWhatsAppText(
  to: string,
  message: string,
  meta?: { userId?: string; kind?: string; entityId?: string },
): Promise<SendResult> {
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, status: 0, error: "invalid_phone" };
  if (!isWhatsAppConfigured()) {
    console.warn("[whatsapp] not configured; skipping send to", phone);
    return { ok: false, status: 0, error: "not_configured" };
  }
  try {
    const res = await fetch(`${BASE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: phone,
        type: "text",
        message,
        instance_id: INSTANCE_ID,
        access_token: ACCESS_TOKEN,
      }),
    });
    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text; }
    const ok = res.ok;
    // fire-and-forget audit — best-effort
    prisma.auditLog.create({
      data: {
        userId: meta?.userId ?? null,
        action: ok ? "whatsapp.send" : "whatsapp.send_failed",
        entityType: meta?.kind ?? "WhatsApp",
        entityId: meta?.entityId ?? null,
        metadata: { to: phone, status: res.status, kind: meta?.kind ?? null } as never,
      },
    }).catch(() => {});
    return { ok, status: res.status, body };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp] send failed", error);
    return { ok: false, status: 0, error };
  }
}

/** Send with a document/media URL (invoice PDF, contract, etc.) */
export async function sendWhatsAppMedia(
  to: string,
  mediaUrl: string,
  opts: { caption?: string; filename?: string; type?: "media" | "document" } = {},
): Promise<SendResult> {
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, status: 0, error: "invalid_phone" };
  if (!isWhatsAppConfigured()) return { ok: false, status: 0, error: "not_configured" };
  try {
    const res = await fetch(`${BASE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: phone,
        type: opts.type ?? "media",
        media_url: mediaUrl,
        filename: opts.filename,
        message: opts.caption ?? "",
        instance_id: INSTANCE_ID,
        access_token: ACCESS_TOKEN,
      }),
    });
    const text = await res.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text; }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Generate a numeric OTP of the given length. */
export function generateOtp(length = 6): string {
  const max = 10 ** length;
  const n = Math.floor(Math.random() * max);
  return String(n).padStart(length, "0");
}

/** Fire-and-forget notification wrappers — never throw into calling route. */
export function notifyWhatsApp(
  to: string | null | undefined,
  message: string,
  meta?: { userId?: string; kind?: string; entityId?: string },
): void {
  if (!to) return;
  void sendWhatsAppText(to, message, meta);
}

export const WA = {
  send: sendWhatsAppText,
  media: sendWhatsAppMedia,
  notify: notifyWhatsApp,
  normalize: normalizePhone,
  isConfigured: isWhatsAppConfigured,
};
