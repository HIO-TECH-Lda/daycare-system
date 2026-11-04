import { waitUntil } from '@vercel/functions';

const pending = new Set<Promise<unknown>>();

/**
 * Run work after the response has been sent (notifications, audit log writes).
 * On Vercel, `waitUntil` keeps the function alive until the task settles; elsewhere the
 * task simply runs. Errors are logged, never thrown.
 */
export function runInBackground(label: string, task: () => Promise<unknown>): void {
  const promise = Promise.resolve()
    .then(task)
    .catch((error) => console.error(`[background] ${label} failed:`, error))
    .finally(() => pending.delete(promise));
  pending.add(promise);
  waitUntil(promise);
}

/** Waits for all background tasks started so far (used by tests). */
export async function settleBackgroundTasks(): Promise<void> {
  while (pending.size > 0) {
    await Promise.allSettled([...pending]);
  }
}
