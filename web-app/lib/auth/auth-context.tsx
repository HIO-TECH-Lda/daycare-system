'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, type User } from '@/lib/api/auth';
import { onSessionEnded, session } from '@/lib/api/client';

interface AuthState {
  user: User | null;
  /** True until the stored session has been checked */
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  /** After accepting an invite (the API already logged the user in) */
  setUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from storage (only in the browser, after the first render)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let restored: User | null = null;
      if (session.token()) {
        try {
          restored = await authApi.me();
        } catch {
          session.clear();
        }
      }
      if (!cancelled) {
        setUser(restored);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  // Session ended elsewhere (expired, password changed, account deactivated)
  useEffect(() => onSessionEnded(logout), [logout]);

  const login = useCallback(async (identifier: string, password: string) => {
    const loggedIn = await authApi.login(identifier, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const value = useMemo(() => ({ user, loading, login, setUser, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
