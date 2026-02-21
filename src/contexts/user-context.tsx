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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    // Safety net: never let the loading skeleton show for more than 4 s
    const giveUp = setTimeout(() => setLoading(false), 4000);
    try {
      // Cache-buster ensures the browser never serves a stale /me response
      const res = await fetch(`/api/auth/me?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      setUser(data.id ? (data as AuthUser) : null);
    } catch {
      setUser(null);
    } finally {
      clearTimeout(giveUp);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
