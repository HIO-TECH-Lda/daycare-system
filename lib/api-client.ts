/**
 * Centralized API client for the backend (../api).
 * - Base URL from NEXT_PUBLIC_API_URL
 * - JWT sent in Authorization header when set
 * - Throws ApiClientError on non-2xx with API message when available
 */

const getBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    if (typeof window === 'undefined') {
      return 'http://localhost:3002';
    }
    return `${window.location.origin.replace(/:\d+$/, '')}:3002`;
  }
  return url.replace(/\/$/, '');
};

// Token store: set after login, cleared on logout. API client adds it to requests.
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** API response shape (matches backend ApiResponse / JSON body) */
export interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
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
};

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponseBody<T>> {
  const { body, token = accessToken, headers: extraHeaders = {} } = options;
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

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

  if (!res.ok) {
    const message =
      (json?.message || json?.error) ?? `Request failed: ${res.status} ${res.statusText}`;
    throw new ApiClientError(message, res.status, json ?? undefined);
  }

  return (json ?? { success: true, message: '', data: undefined }) as ApiResponseBody<T>;
}

/** GET request */
export function apiGet<T = unknown>(path: string, token?: string | null): Promise<ApiResponseBody<T>> {
  return request<T>('GET', path, { token });
}

/** POST request */
export function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  token?: string | null
): Promise<ApiResponseBody<T>> {
  return request<T>('POST', path, { body, token });
}

/** PUT request */
export function apiPut<T = unknown>(
  path: string,
  body?: unknown,
  token?: string | null
): Promise<ApiResponseBody<T>> {
  return request<T>('PUT', path, { body, token });
}

/** PATCH request */
export function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  token?: string | null
): Promise<ApiResponseBody<T>> {
  return request<T>('PATCH', path, { body, token });
}

/** DELETE request */
export function apiDelete<T = unknown>(path: string, token?: string | null): Promise<ApiResponseBody<T>> {
  return request<T>('DELETE', path, { token });
}

/**
 * Auth API helpers (backend: POST /api/v1/auth/login, GET /api/v1/auth/me, etc.)
 * Use these from the auth context or login page.
 */
export const authApi = {
  base: '/api/v1/auth',

  login: (email: string, password: string) =>
    apiPost<{ user: unknown; token: string; refreshToken?: string }>(
      '/api/v1/auth/login',
      { email, password }
    ),

  register: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    apiPost<{ user: unknown; token: string }>('/api/v1/auth/register', data),

  me: (token: string) => apiGet<{ user: unknown }>('/api/v1/auth/me', token),

  refresh: (refreshToken: string) =>
    apiPost<{ token: string; refreshToken?: string }>('/api/v1/auth/refresh', { refreshToken }),

  logout: (token: string) => apiPost('/api/v1/auth/logout', {}, token),
};
