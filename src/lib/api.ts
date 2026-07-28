import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { demoResolve, isDemoMode } from "./demo-data";


// Default to same-origin /api (works when Nginx على ash-holding.sa يمرر /api للباك اند).
// في معاينات Lovable (lovableproject.com / lovable.app / lovable.dev) نوجّه للـ API الحقيقي مباشرة.
function resolveBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) return envUrl;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLovablePreview = /lovableproject\.com$|lovable\.app$|lovable\.dev$/.test(host);
    if (isLovablePreview && host !== "ash-holding.lovable.app") {
      return "https://ash-holding.sa/api";
    }
  }
  return "/api";
}
const BASE = resolveBase();

export const ACCESS_KEY = "ash_access";
export const REFRESH_KEY = "ash_refresh";

function isBrowser() { return typeof window !== "undefined"; }
export function getAccessToken(): string | null { return isBrowser() ? localStorage.getItem(ACCESS_KEY) : null; }
export function getRefreshToken(): string | null { return isBrowser() ? localStorage.getItem(REFRESH_KEY) : null; }
export function setTokens(access: string | null, refresh: string | null) {
  if (!isBrowser()) return;
  if (access) localStorage.setItem(ACCESS_KEY, access); else localStorage.removeItem(ACCESS_KEY);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh); else localStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new Event("ash-auth-change"));
}

export const api = axios.create({ baseURL: BASE, withCredentials: false, timeout: 15000 });

api.interceptors.request.use((config) => {
  const t = getAccessToken();
  if (t) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${t}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;
async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  refreshPromise = axios
    .post(`${BASE}/auth/refresh`, { refreshToken })
    .then((r) => {
      const { accessToken, refreshToken: newRefresh } = r.data as { accessToken: string; refreshToken: string };
      setTokens(accessToken, newRefresh);
      return accessToken;
    })
    .catch(() => { setTokens(null, null); return null; })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function demoResponse(config: AxiosRequestConfig): AxiosResponse {
  let url = (config.url ?? "").toString();
  if (config.params && typeof config.params === "object") {
    const qs = new URLSearchParams(
      Object.entries(config.params as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  const method = (config.method ?? "get").toUpperCase();
  let body: unknown;
  try { body = typeof config.data === "string" ? JSON.parse(config.data) : config.data; } catch { body = config.data; }
  const data = demoResolve(url, method, body);
  return { data, status: 200, statusText: "OK (demo)", headers: {}, config } as AxiosResponse;
}


api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    // Auth refresh
    if (status === 401 && original && !original._retry && !original.url?.includes("/auth/")) {
      original._retry = true;
      const fresh = await tryRefresh();
      if (fresh) {
        original.headers = { ...(original.headers as object), Authorization: `Bearer ${fresh}` } as never;
        return api.request(original);
      }
    }
    // Demo-mode fallback is explicitly opt-in only; never fake admin data.
    const isNetwork = !error.response;
    const isMissing = status === 404 || status === 502 || status === 503 || status === 504;
    const path = (original?.url ?? "").toString().replace(/^https?:\/\/[^/]+/, "").replace(/^\/api/, "");
    const isAdminEndpoint = path.startsWith("/admin") || path.startsWith("admin");
    const isAdminPage = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
    if (original && (isNetwork || isMissing) && isDemoMode() && !isAdminEndpoint && !isAdminPage && !original.url?.includes("/auth/")) {
      return demoResponse(original);
    }
    return Promise.reject(error);
  },
);


export function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || e.message;
  }
  return e instanceof Error ? e.message : "حدث خطأ غير متوقع";
}
