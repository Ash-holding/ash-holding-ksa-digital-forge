import axios, { AxiosError, type AxiosRequestConfig } from "axios";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) || "/api";

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

export const api = axios.create({ baseURL: BASE, withCredentials: false });

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

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes("/auth/")) {
      original._retry = true;
      const fresh = await tryRefresh();
      if (fresh) {
        original.headers = { ...(original.headers as object), Authorization: `Bearer ${fresh}` } as never;
        return api.request(original);
      }
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
