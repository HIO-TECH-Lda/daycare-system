/// <reference lib="esnext" />
/// <reference lib="webworker" />
/**
 * Service worker (bundled by Serwist, served at /serwist/sw.js).
 *
 * - Precaches the app shell and static assets, so the portal opens without internet.
 * - Leaves other origins alone, the API included: its responses carry personal data and a tablet
 *   is shared, so they're never cached here. Data for offline use is kept per person by the app
 *   (see lib/offline). Not intercepting also keeps the API's own CORS handling untouched.
 * - Pages that can't load offline fall back to /~offline.
 */
import { defaultCache } from '@serwist/turbopack/worker';
import { Serwist, Strategy, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Serwist's defaults also cache other origins and same-origin /api/ calls: drop both, so API
// data is never cached here even if the API is ever served through this origin
const API_CACHES = new Set(['cross-origin', 'apis']);
const sameOriginCache = defaultCache.filter(({ handler }) => !(handler instanceof Strategy && API_CACHES.has(handler.cacheName)));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: sameOriginCache,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document'
      }
    ]
  }
});

serwist.addEventListeners();
