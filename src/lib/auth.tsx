import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setTokens, getAccessToken, apiError } from "./api";

export type Role = "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "ACCOUNTANT" | "CLIENT";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  avatarUrl?: string | null;
  client?: { id: string; companyName?: string | null } | null;
};

type Ctx = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

const DEMO_ACCOUNTS: Array<{ email: string; password: string; user: AuthUser }> = [
  {
    email: "admin@ashholding.sa",
    password: "Admin@12345",
    user: { id: "demo-admin", email: "admin@ashholding.sa", name: "المدير التجريبي", role: "SUPER_ADMIN" },
  },
  {
    email: "client@demo.sa",
    password: "Client@12345",
    user: { id: "demo-client", email: "client@demo.sa", name: "عميل تجريبي", role: "CLIENT", client: { id: "demo-c1", companyName: "شركة تجريبية" } },
  },
];

function demoLogin(email: string, password: string): AuthUser | null {
  const match = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
  return match ? match.user : null;
}

const USER_CACHE_KEY = "ash_user_cache";

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously from cache so protected pages render instantly
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    if (!localStorage.getItem("ash_access")) return null;
    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    // If we have a cached user, don't block UI — refresh in background
    if (!localStorage.getItem("ash_access")) return false;
    return !localStorage.getItem(USER_CACHE_KEY);
  });

  const load = useCallback(async () => {
    if (!getAccessToken()) { setUser(null); setLoading(false); return; }
    const demo = typeof window !== "undefined" ? localStorage.getItem("ash_demo_user") : null;
    if (demo) { try { setUser(JSON.parse(demo)); } catch { setUser(null); } setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      if (typeof window !== "undefined") localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
    } catch {
      // Keep cached user if the network hiccups; only clear on explicit 401
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const handler = () => load();
    if (typeof window !== "undefined") window.addEventListener("ash-auth-change", handler);
    return () => { if (typeof window !== "undefined") window.removeEventListener("ash-auth-change", handler); };
  }, [load]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return data.user as AuthUser;
    } catch (e) {
      // Demo fallback when backend is not deployed (preview mode)
      const demo = demoLogin(email, password);
      if (demo) {
        setTokens("demo-access", "demo-refresh");
        if (typeof window !== "undefined") localStorage.setItem("ash_demo_user", JSON.stringify(demo));
        setUser(demo);
        return demo;
      }
      throw new Error(apiError(e));
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout", {}); } catch { /* ignore */ }
    if (typeof window !== "undefined") {
      localStorage.removeItem("ash_demo_user");
      localStorage.removeItem(USER_CACHE_KEY);
    }
    setTokens(null, null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}

export function landingFor(role: Role): string {
  if (role === "CLIENT") return "/client";
  if (role === "SUPPORT") return "/admin/support";
  if (role === "ACCOUNTANT") return "/admin/invoices";
  return "/admin";
}
