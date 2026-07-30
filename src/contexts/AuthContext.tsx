import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCurrentUser, redirectToLogin, logout as apiLogout, type AuthUser } from "@/lib/api/services/authService";
import { getFacultyByKerberos } from "@/lib/api/services/directoryService";

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the boot-time /api/auth/me check is in flight. */
  loading: boolean;
  /** True when the logged-in user's kerberos exists in the faculties collection
   * (i.e. they are IITD faculty, not a student). Decided from the DB, not the
   * OAuth category claim. */
  isFaculty: boolean;
  login: () => void;
  logout: () => Promise<void>;
  /** Re-check the session (e.g. after a 401 from an API call). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFaculty, setIsFaculty] = useState(false);

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

  // Faculty vs student is decided by the DB: the logged-in kerberos must exist
  // in the faculties collection (same source as the Directory profile page).
  // Found -> faculty; a 404/error (not in the collection) -> student.
  useEffect(() => {
    let cancelled = false;
    const kerberos = user?.kerberos;
    if (!kerberos) {
      setIsFaculty(false);
      return;
    }
    (async () => {
      try {
        await getFacultyByKerberos(kerberos);
        if (!cancelled) setIsFaculty(true);
      } catch {
        if (!cancelled) setIsFaculty(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.kerberos]);

  const login = useCallback(() => redirectToLogin(), []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setIsFaculty(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isFaculty, login, logout, refresh }}>
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
