'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from './types';
import { messages } from './messages';
import { authApi, setAccessToken, setRefreshToken, getAccessToken, getRefreshToken, clearTokens, ApiClientError } from './api-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Helper to map API user to frontend User type
function mapApiUserToUser(apiUser: any): User {
  return {
    id: apiUser.id || apiUser._id,
    email: apiUser.email,
    name: apiUser.name || `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim(),
    role: apiUser.role as User['role'],
    phone: apiUser.phone || '',
  };
}

// Helper to try refreshing token
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await authApi.refresh(refreshToken);
    if (response.success && response.data) {
      setAccessToken(response.data.token);
      if (response.data.refreshToken) {
        setRefreshToken(response.data.refreshToken);
      }
      return true;
    }
  } catch (error) {
    // Refresh failed, clear tokens
    clearTokens();
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from token on mount
  const loadUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.me(token);
      if (response.success && response.data?.user) {
        const mappedUser = mapApiUserToUser(response.data.user);
        setUser(mappedUser);
        // Store user in localStorage for quick access
        localStorage.setItem('daycare_user', JSON.stringify(mappedUser));
      } else {
        // Token might be invalid, try refresh
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          const newResponse = await authApi.me();
          if (newResponse.success && newResponse.data?.user) {
            const mappedUser = mapApiUserToUser(newResponse.data.user);
            setUser(mappedUser);
            localStorage.setItem('daycare_user', JSON.stringify(mappedUser));
          } else {
            clearTokens();
            localStorage.removeItem('daycare_user');
          }
        } else {
          clearTokens();
          localStorage.removeItem('daycare_user');
        }
      }
    } catch (error) {
      // If 401, try refresh token
      if (error instanceof ApiClientError && error.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          try {
            const newResponse = await authApi.me();
            if (newResponse.success && newResponse.data?.user) {
              const mappedUser = mapApiUserToUser(newResponse.data.user);
              setUser(mappedUser);
              localStorage.setItem('daycare_user', JSON.stringify(mappedUser));
            }
          } catch {
            clearTokens();
            localStorage.removeItem('daycare_user');
          }
        } else {
          clearTokens();
          localStorage.removeItem('daycare_user');
        }
      } else {
        clearTokens();
        localStorage.removeItem('daycare_user');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      if (!response.success || !response.data) {
        throw new Error(response.message || messages.auth.invalidCredentials);
      }

      const { user: apiUser, token, refreshToken } = response.data;
      
      // Set tokens
      setAccessToken(token);
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }

      // Map and set user
      const mappedUser = mapApiUserToUser(apiUser);
      setUser(mappedUser);
      localStorage.setItem('daycare_user', JSON.stringify(mappedUser));
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw new Error(error.message || messages.auth.invalidCredentials);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = getAccessToken();
      if (token) {
        await authApi.logout(token);
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      clearTokens();
      setUser(null);
      localStorage.removeItem('daycare_user');
    }
  };

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
