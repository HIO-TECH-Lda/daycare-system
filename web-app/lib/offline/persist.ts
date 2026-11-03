/**
 * Keeps selected query results on the device (IndexedDB), so staff screens open offline with
 * the last data they saw. Only queries marked `meta: { offline: true }` are stored, and the
 * store is wiped when someone signs out or signs in (shared tablets).
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { dehydrate, type Query, type QueryClient } from '@tanstack/react-query';
import { createStore, del, get, set } from 'idb-keyval';

const store = typeof indexedDB === 'undefined' ? undefined : createStore('sdc-cache', 'queries');

const KEY = 'sdc.queries';

export const queryPersister = createAsyncStoragePersister({
  key: KEY,
  throttleTime: 1000,
  storage: {
    getItem: async (key) => (store ? ((await get<string>(key, store)) ?? null) : null),
    setItem: async (key, value: string) => {
      if (store) await set(key, value, store);
    },
    removeItem: async (key) => {
      if (store) await del(key, store);
    }
  }
});

export const persistOptions = {
  persister: queryPersister,
  // A day old at most: older data would mislead more than it helps
  maxAge: 24 * 60 * 60 * 1000,
  // Change when a stored query's shape changes, so old shapes are dropped
  buster: 'v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) => query.state.status === 'success' && query.meta?.offline === true
  }
};

/**
 * Stores the offline data right away, bypassing the persister's 1 s throttle. Called when the app
 * is hidden or closed: data that arrived in the last second would otherwise be lost, and a tablet
 * reopened without internet would have nothing to show. Same format as the persister.
 */
export function saveOfflineDataNow(queryClient: QueryClient): void {
  if (!store) return;
  const snapshot = { buster: persistOptions.buster, timestamp: Date.now(), clientState: dehydrate(queryClient, persistOptions.dehydrateOptions) };
  void set(KEY, JSON.stringify(snapshot), store).catch(() => {
    // Storage unavailable or full: the throttled save keeps trying
  });
}

/** Removes the data stored for offline use (not the writes waiting to sync). */
export async function clearOfflineData(): Promise<void> {
  try {
    await queryPersister.removeClient();
  } catch {
    // Storage unavailable: nothing was stored
  }
}
