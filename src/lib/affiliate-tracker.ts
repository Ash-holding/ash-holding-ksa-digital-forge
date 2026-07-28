// Client-side affiliate tracker.
// Captures ?ref & utm_* from URL and pings /api/track/click.
// Also exposes bindAffiliate(clientId) to call /api/track/attribute after signup.
import { apiFetch } from "@/lib/api";

const REF_KEY = "ash_ref_code";
const SEEN_KEY = "ash_ref_seen";

type Utm = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

function readUtm(sp: URLSearchParams): Utm {
  const utm: Utm = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
    const v = sp.get(k);
    if (v) utm[k] = v.slice(0, 120);
  }
  return utm;
}

/**
 * Captures ref+utm from current URL, stores locally, and reports one click
 * per (ref + landing path) per browser session to avoid duplicate pings.
 */
export async function initAffiliateTracking(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    const linkSlug = url.searchParams.get("aff") || undefined;
    if (!ref) return;

    localStorage.setItem(REF_KEY, ref);

    const key = `${SEEN_KEY}:${ref}:${url.pathname}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    await apiFetch("/api/track/click", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        ref,
        linkSlug,
        landing: url.pathname + url.search,
        referrer: document.referrer || undefined,
        utm: readUtm(url.searchParams),
      }),
    }).catch(() => null);
  } catch {
    /* silent */
  }
}

/** Call right after a new client is created/authenticated. */
export async function bindAffiliate(clientId: string): Promise<void> {
  if (typeof window === "undefined" || !clientId) return;
  try {
    await apiFetch("/api/track/attribute", {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ clientId }),
    }).catch(() => null);
  } catch {
    /* silent */
  }
}

export function getStoredRefCode(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(REF_KEY); } catch { return null; }
}
