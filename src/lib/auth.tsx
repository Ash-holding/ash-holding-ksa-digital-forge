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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) { setUser(null); setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch { setUser(null); }
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
    } catch (e) { throw new Error(apiError(e)); }
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout", {}); } catch { /* ignore */ }
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
