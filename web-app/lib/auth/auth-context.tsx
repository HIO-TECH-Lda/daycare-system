'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, type User } from '@/lib/api/auth';
import { ApiRequestError, onSessionEnded, session } from '@/lib/api/client';
import { clearOfflineData } from '@/lib/offline/persist';

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
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((next: User) => {
    session.cacheUser(next);
    setUserState(next);
  }, []);

  // Restore the session from storage (only in the browser, after the first render).
  // Offline or with the API down, it can't be confirmed: keep the last confirmed user so staff
  // can keep working. Only a rejected session (401/403) ends it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let restored: User | null = null;
      if (session.token()) {
        try {
          restored = await authApi.me();
          session.cacheUser(restored);
        } catch (error) {
          const rejected = error instanceof ApiRequestError && (error.status === 401 || error.status === 403);
          if (!rejected) restored = session.cachedUser<User>();
          else {
            session.clear();
            void clearOfflineData();
          }
        }
      }
      if (!cancelled) {
        setUserState(restored);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Writes still waiting to sync stay on the device and are sent when this person signs in again
  const logout = useCallback(() => {
    authApi.logout();
    queryClient.clear();
    void clearOfflineData();
    setUserState(null);
  }, [queryClient]);

  // Session ended elsewhere (expired, password changed, account deactivated)
  useEffect(() => onSessionEnded(logout), [logout]);

  const login = useCallback(async (identifier: string, password: string) => {
    const loggedIn = await authApi.login(identifier, password);
    // Nothing from a previous person on this device may show up for the new one
    queryClient.clear();
    await clearOfflineData();
    setUser(loggedIn);
    return loggedIn;
  }, [queryClient, setUser]);

  const value = useMemo(() => ({ user, loading, login, setUser, logout }), [user, loading, login, setUser, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
