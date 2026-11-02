/**
 * API client for the backend (../api), base URL from NEXT_PUBLIC_API_URL.
 *
 * - Sends the access token; on a 401 it refreshes the session once (shared between concurrent
 *   requests) and retries. If refreshing fails the session is cleared and `onSessionEnded` fires.
 * - Throws ApiRequestError with the API's (Portuguese) message for anything that isn't 2xx.
 */

const TOKEN_KEY = 'sdc.token';
const REFRESH_KEY = 'sdc.refresh';
// The signed-in user, so the app still opens offline (the API can't confirm the session then)
const USER_KEY = 'sdc.user';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
  errors?: string[];
}

export class ApiRequestError extends Error {
  constructor(public status: number, message: string, public errors: string[] = []) {
    super(message);
  }
}

export function apiBaseUrl(): string {
  return `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002').replace(/\/$/, '')}/api/v1`;
}

// --- Session tokens (localStorage; guarded for private mode / server rendering) ---

function read(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable: the session lasts for this page only
  }
}

export const session = {
  token: () => read(TOKEN_KEY),
  refreshToken: () => read(REFRESH_KEY),
  set(tokens: { token: string; refreshToken?: string }) {
    write(TOKEN_KEY, tokens.token);
    if (tokens.refreshToken) write(REFRESH_KEY, tokens.refreshToken);
  },
  /** The last user the API confirmed for this session (JSON), or null */
  cachedUser: <T>(): T | null => {
    try {
      const raw = read(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  cacheUser(user: unknown) {
    write(USER_KEY, JSON.stringify(user));
  },
  clear() {
    write(TOKEN_KEY, null);
    write(REFRESH_KEY, null);
    write(USER_KEY, null);
  }
};

const sessionEndedListeners = new Set<() => void>();

/** Called when the session can't be refreshed (expired, password changed, account deactivated). */
export function onSessionEnded(listener: () => void): () => void {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

// --- Requests ---

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Params = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  body?: unknown;
  params?: Params;
  /** false for public endpoints (login, invites, password reset) */
  auth?: boolean;
  /** Abort (e.g. a timeout); an aborted request fails like a network error */
  signal?: AbortSignal;
}

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = session.refreshToken();
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await send<{ token: string; refreshToken: string }>('POST', '/auth/refresh', { body: { refreshToken }, auth: false });
      session.set(res.data);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function send<T>(method: Method, path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const url = new URL(apiBaseUrl() + path);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = options.auth === false ? null : session.token();  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal
    });
  } catch {
    throw new ApiRequestError(0, 'Sem ligação ao servidor. Verifique a sua ligação à internet.');
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      payload?.message || 'Ocorreu um erro. Tente novamente.',
      payload?.errors ?? []
    );
  }
  return payload as ApiEnvelope<T>;
}

/** Authenticated request with one automatic session refresh on 401. */
export async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  try {
    return await send<T>(method, path, options);
  } catch (error) {
    const authenticated = options.auth !== false && !!session.token();
    if (!(error instanceof ApiRequestError) || error.status !== 401 || !authenticated) throw error;

    if (await refreshSession()) return send<T>(method, path, options);
    session.clear();
    sessionEndedListeners.forEach((listener) => listener());
    throw error;
  }
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown, options?: Pick<RequestOptions, 'signal'>) => request<T>('POST', path, { body, ...options }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path)
};

/** Public endpoints: never send or refresh the session. */
export const publicApi = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, { params, auth: false }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body, auth: false })
};
