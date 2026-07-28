// Client-side affiliate tracker.
// Captures ?ref & utm_* from URL and pings /api/track/click.
// Also exposes bindAffiliate(clientId) to call /api/track/attribute after signup.
import { api } from "@/lib/api";

const REF_KEY = "ash_ref_code";
const SEEN_KEY = "ash_ref_seen";

type Utm = Partial<
  Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content", string>
>;

function readUtm(sp: URLSearchParams): Utm {
  const utm: Utm = {};
  (["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const).forEach((k) => {
    const v = sp.get(k);
    if (v) utm[k] = v.slice(0, 120);
  });
  return utm;
}

/**
 * Capture ref+utm from current URL, store locally, and report one click
 * per (ref + landing path) per browser session.
 */
export async function initAffiliateTracking(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    const linkSlug = url.searchParams.get("aff") || undefined;
    if (!ref) return;

    try { localStorage.setItem(REF_KEY, ref); } catch { /* ignore */ }

    const key = `${SEEN_KEY}:${ref}:${url.pathname}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    await api.post(
      "/track/click",
      {
        ref,
        linkSlug,
        landing: url.pathname + url.search,
        referrer: document.referrer || undefined,
        utm: readUtm(url.searchParams),
      },
      { withCredentials: true },
    ).catch(() => null);
  } catch {
    /* silent */
  }
}

/** Call right after a new client is created / authenticated. */
export async function bindAffiliate(clientId: string): Promise<void> {
  if (typeof window === "undefined" || !clientId) return;
  try {
    await api.post(
      "/track/attribute",
      { clientId },
      { withCredentials: true },
    ).catch(() => null);
  } catch {
    /* silent */
  }
}

export function getStoredRefCode(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(REF_KEY); } catch { return null; }
}
