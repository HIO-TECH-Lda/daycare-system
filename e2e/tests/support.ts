import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API = 'http://localhost:3102/api/v1';

/** Demo accounts from api/scripts/seed.ts (throwaway database). */
export const DEMO_PASSWORD = 'Demo@2026';
export const ACCOUNTS = {
  admin: 'admin@sonhodecrianca.mz',
  maria: 'maria@sonhodecrianca.mz', // educator: Berçário A, Maternal I
  joao: 'joao@sonhodecrianca.mz', // educator: Maternal II, Jardim I
  ana: 'ana.silva@demo.com', // parent of two
  carlos: 'carlos.santos@demo.com' // parent of one
} as const;

export interface Session {
  token: string;
  refreshToken: string;
  user: { id: string; name: string; role: string };
}

export async function apiLogin(request: APIRequestContext, identifier: string, password = DEMO_PASSWORD): Promise<Session> {
  const res = await request.post(`${API}/auth/login`, { data: { identifier, password } });
  expect(res.ok(), `login ${identifier}`).toBeTruthy();
  return (await res.json()).data;
}

/** Signs the page in the way the app keeps its session (localStorage), without the login form. */
export async function signIn(page: Page, identifier: string, password = DEMO_PASSWORD): Promise<Session> {
  const session = await apiLogin(page.request, identifier, password);
  await page.goto('/login');
  await page.evaluate((s) => {
    localStorage.setItem('sdc.token', s.token);
    localStorage.setItem('sdc.refresh', s.refreshToken);
    localStorage.setItem('sdc.user', JSON.stringify(s.user));
  }, session);
  return session;
}

/** An authenticated GET against the API; returns status and body. */
export async function apiGet(request: APIRequestContext, session: Session, path: string) {
  const res = await request.get(`${API}${path}`, { headers: { Authorization: `Bearer ${session.token}` } });
  return { status: res.status(), body: res.ok() ? await res.json() : null };
}

/** yyyy-mm-dd, `months` months ago (for a birth date). */
export function monthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

/** Picks a class in the staff screens' class picker, when the educator has more than one. */
export async function pickClass(page: Page, name: string) {
  const picker = page.getByRole('combobox', { name: 'Turma' });
  if (await picker.isVisible().catch(() => false)) {
    await picker.click();
    await page.getByRole('option', { name }).click();
  }
}

/** Waits until the service worker controls the page (offline navigation needs it). */
export async function serviceWorkerReady(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
}
