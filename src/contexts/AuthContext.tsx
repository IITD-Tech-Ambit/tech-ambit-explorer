import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCurrentUser, redirectToLogin, logout as apiLogout, type AuthUser } from "@/lib/api/services/authService";

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the boot-time /api/auth/me check is in flight. */
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  /** Re-check the session (e.g. after a 401 from an API call). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setUser(await fetchCurrentUser());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await fetchCurrentUser();
      if (!cancelled) {
        setUser(current);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(() => redirectToLogin(), []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
