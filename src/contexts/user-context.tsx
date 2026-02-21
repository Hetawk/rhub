"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleChangedAt: string | null;
  sessionCreatedAt: string;
}

interface UserContextValue {
  user: AuthUser | null;
  /** true only during the initial fetch — never flashes back to true */
  loading: boolean;
  /** Call after sign in / sign out to refresh the user state */
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  console.log("[UserProvider] Component render");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    console.log(
      "[UserContext] fetchUser called - search:",
      typeof window !== "undefined" ? window.location.search : "SSR",
    );

    // If just logged out, skip the fetch and immediately show logged-out state
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("logout=1")
    ) {
      console.log("[UserContext] Logout detected, clearing state");
      setUser(null);
      setLoading(false);
      // Clean up the URL param without triggering a reload
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    // Safety net: never let the loading skeleton show for more than 4 s
    const giveUp = setTimeout(() => {
      console.log("[UserContext] Timeout - forcing loading=false");
      setLoading(false);
    }, 4000);

    try {
      console.log("[UserContext] Fetching /api/auth/me");
      // Cache-buster ensures the browser never serves a stale /me response
      const res = await fetch(`/api/auth/me?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        credentials: "include",
      });
      console.log("[UserContext] Response status:", res.status);
      const data = await res.json();
      console.log("[UserContext] Response data:", data);
      setUser(data.id ? (data as AuthUser) : null);
    } catch (err) {
      console.error("[UserContext] Fetch error:", err);
      setUser(null);
    } finally {
      clearTimeout(giveUp);
      console.log("[UserContext] Setting loading=false");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("[UserContext] useEffect triggered");
    fetchUser();
  }, [fetchUser]);

  console.log(
    "[UserProvider] Rendering - user:",
    user?.name || "null",
    "loading:",
    loading,
  );

  return (
    <UserContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
