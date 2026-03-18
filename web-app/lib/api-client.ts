/**
 * Centralized API client for the backend (../api).
 * Base URL from NEXT_PUBLIC_API_URL, JWT in Authorization when set.
 * User-facing error messages are in Portuguese (lib/messages).
 */
import { messages } from './messages';

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  let baseUrl: string;
  if (!url) {
    if (typeof window === 'undefined') {
      baseUrl = 'http://localhost:3002';
    } else {
      baseUrl = `${window.location.origin.replace(/:\d+$/, '')}:3002`;
    }
  } else {
    baseUrl = url.replace(/\/$/, '');
  }
  // Ensure /api/v1 is appended
  return `${baseUrl}/api/v1`;
};

// Token store: set after login, cleared on logout. API client adds it to requests.
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Initialize tokens from localStorage if available (client-side only)
if (typeof window !== 'undefined') {
  const storedAccessToken = localStorage.getItem('daycare_access_token');
  const storedRefreshToken = localStorage.getItem('daycare_refresh_token');
  if (storedAccessToken) {
    accessToken = storedAccessToken;
  }
  if (storedRefreshToken) {
    refreshToken = storedRefreshToken;
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token && typeof window !== 'undefined') {
    localStorage.setItem('daycare_access_token', token);
  } else if (!token && typeof window !== 'undefined') {
    localStorage.removeItem('daycare_access_token');
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('daycare_access_token');
    if (stored) {
      accessToken = stored;
      return stored;
    }
  }
  return null;
}

export function setRefreshToken(token: string | null): void {
  refreshToken = token;
  if (token && typeof window !== 'undefined') {
    localStorage.setItem('daycare_refresh_token', token);
  } else if (!token && typeof window !== 'undefined') {
    localStorage.removeItem('daycare_refresh_token');
  }
}

export function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('daycare_refresh_token');
    if (stored) {
      refreshToken = stored;
      return stored;
    }
  }
  return null;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('daycare_access_token');
    localStorage.removeItem('daycare_refresh_token');
  }
}

/** API response shape (matches backend ApiResponse / JSON body) */
export interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: ApiResponseBody
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type RequestOptions = {
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
};

// Track if we're currently refreshing to avoid loops
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    const refreshTokenValue = getRefreshToken();
    if (!refreshTokenValue) {
      isRefreshing = false;
      refreshPromise = null;
      return false;
    }

    try {
      // Call refresh endpoint directly using request to avoid circular dependency
      const response = await request<{ token: string; refreshToken?: string }>(
        'POST',
        '/auth/refresh',
        { body: { refreshToken: refreshTokenValue }, token: null } // Don't send auth header for refresh
      );
      if (response.success && response.data) {
        setAccessToken(response.data.token);
        if (response.data.refreshToken) {
          setRefreshToken(response.data.refreshToken);
        }
        isRefreshing = false;
        refreshPromise = null;
        return true;
      }
    } catch (error) {
      // Refresh failed, clear tokens
      clearTokens();
    }

    isRefreshing = false;
    refreshPromise = null;
    return false;
  })();

  return refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponseBody<T>> {
  const { body, token = getAccessToken(), headers: extraHeaders = {}, params } = options;
  let url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  
  // Add query parameters
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json: ApiResponseBody<T> | null = null;
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      json = (await res.json()) as ApiResponseBody<T>;
    } catch {
      // ignore
    }
  }

  // Handle 401 Unauthorized - try to refresh token
  if (res.status === 401 && token && !path.startsWith('/auth/')) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      // Retry the request with new token
      const newToken = getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        let retryJson: ApiResponseBody<T> | null = null;
        const retryContentType = retryRes.headers.get('content-type');
        if (retryContentType?.includes('application/json')) {
          try {
            retryJson = (await retryRes.json()) as ApiResponseBody<T>;
          } catch {
            // ignore
          }
        }

        if (!retryRes.ok) {
          const message =
            (retryJson?.message || retryJson?.error) ?? messages.api.requestFailed;
          throw new ApiClientError(message, retryRes.status, retryJson ?? undefined);
        }

        return (retryJson ?? { success: true, message: '', data: undefined }) as ApiResponseBody<T>;
      }
    }
  }

  if (!res.ok) {
    const message =
      (json?.message || json?.error) ?? messages.api.requestFailed;
    throw new ApiClientError(message, res.status, json ?? undefined);
  }

  return (json ?? { success: true, message: '', data: undefined }) as ApiResponseBody<T>;
}

/** GET request */
export function apiGet<T = unknown>(
  path: string,
  options?: { token?: string | null; params?: Record<string, string | number | boolean | undefined> }
): Promise<ApiResponseBody<T>> {
  return request<T>('GET', path, options || {});
}

/** POST request */
export function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  options?: { token?: string | null }
): Promise<ApiResponseBody<T>> {
  return request<T>('POST', path, { body, ...options });
}

/** PUT request */
export function apiPut<T = unknown>(
  path: string,
  body?: unknown,
  options?: { token?: string | null }
): Promise<ApiResponseBody<T>> {
  return request<T>('PUT', path, { body, ...options });
}

/** PATCH request */
export function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  options?: { token?: string | null }
): Promise<ApiResponseBody<T>> {
  return request<T>('PATCH', path, { body, ...options });
}

/** DELETE request */
export function apiDelete<T = unknown>(
  path: string,
  options?: { token?: string | null }
): Promise<ApiResponseBody<T>> {
  return request<T>('DELETE', path, options || {});
}

/**
 * Auth API helpers (backend: POST /auth/login, GET /auth/me, etc.)
 * Use these from the auth context or login page.
 */
export const authApi = {
  login: (email: string, password: string) =>
    apiPost<{ user: unknown; token: string; refreshToken?: string }>(
      '/auth/login',
      { email, password }
    ),

  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: 'responsavel' | 'staff' | 'administrador';
    phone: string;
  }) =>
    apiPost<{ user: unknown; token: string; refreshToken?: string }>('/auth/register', data),

  me: (token?: string | null) => apiGet<{ user: unknown }>('/auth/me', { token }),

  refresh: (refreshToken: string) =>
    apiPost<{ token: string; refreshToken?: string }>('/auth/refresh', { refreshToken }),

  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }, token?: string | null) =>
    apiPut('/auth/me', data, { token }),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }, token?: string | null) =>
    apiPut('/auth/change-password', data, { token }),

  logout: (token?: string | null) => apiPost('/auth/logout', {}, { token }),
};
