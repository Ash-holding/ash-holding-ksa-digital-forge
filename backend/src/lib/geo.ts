// Lightweight IP geolocation via ip-api.com (free, no key, 45 req/min).
// Returns null on failure — never throws.

export type GeoInfo = {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
};

export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0].trim();
  // Strip IPv6 prefix for IPv4 (e.g. ::ffff:1.2.3.4)
  const v4 = first.replace(/^::ffff:/, "");
  // Skip localhost/private
  if (
    v4 === "127.0.0.1" || v4 === "::1" || v4.startsWith("10.") ||
    v4.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(v4)
  ) return null;
  return v4;
}

export async function lookupIp(ip: string): Promise<GeoInfo | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const j = (await res.json()) as {
      status: string; country?: string; countryCode?: string;
      regionName?: string; city?: string; lat?: number; lon?: number;
    };
    if (j.status !== "success") return null;
    return {
      country: j.country ?? null,
      countryCode: j.countryCode ?? null,
      city: j.city ?? null,
      region: j.regionName ?? null,
      lat: typeof j.lat === "number" ? j.lat : null,
      lng: typeof j.lon === "number" ? j.lon : null,
    };
  } catch {
    return null;
  }
}
