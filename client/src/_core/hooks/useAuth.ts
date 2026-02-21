import { getLoginUrl } from "@/const";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type User = {
  id: number;
  email: string;
  name: string;
  role: string;
} | null;

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};

  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch current user
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      setUser(data.user || null);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const state = useMemo(() => {
    return {
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
    };
  }, [user, loading, error]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: fetchUser,
    logout,
  };
}
