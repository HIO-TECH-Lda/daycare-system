/**
 * Keeps selected query results on the device (IndexedDB), so staff screens open offline with
 * the last data they saw. Only queries marked `meta: { offline: true }` are stored, and the
 * store is wiped when someone signs out or signs in (shared tablets).
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';
import { createStore, del, get, set } from 'idb-keyval';

const store = typeof indexedDB === 'undefined' ? undefined : createStore('sdc-cache', 'queries');

export const queryPersister = createAsyncStoragePersister({
  key: 'sdc.queries',
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

/** Removes the data stored for offline use (not the writes waiting to sync). */
export async function clearOfflineData(): Promise<void> {
  try {
    await queryPersister.removeClient();
  } catch {
    // Storage unavailable: nothing was stored
  }
}
