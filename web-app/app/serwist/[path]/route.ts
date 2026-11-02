/**
 * Serves the service worker built from app/sw.ts (Serwist's Turbopack integration).
 * Only `generateStaticParams` and `GET` are re-exported: Cache Components doesn't allow the
 * route segment options (`dynamic`, `revalidate`, ...) that Serwist also returns.
 */
import { createSerwistRoute } from '@serwist/turbopack';

// Ties the precached files to a release, so a new deploy refreshes them
const revision = process.env.COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_SHA ?? crypto.randomUUID();

// The entry pages, so an installed tablet opens offline even before visiting them (other pages
// are cached as they're visited)
const pages = ['/', '/login', '/staff', '/responsavel', '/admin', '/~offline'];

const route = createSerwistRoute({
  swSrc: 'app/sw.ts',
  additionalPrecacheEntries: pages.map((url) => ({ url, revision })),
  // The client's original logo files (≈1 MB), kept for reference only
  globIgnores: ['public/brand/source/**'],
  useNativeEsbuild: true
});

// Built once, at build time. Only the worker is served: anything else is a 404 rather than a
// service worker build at request time, which Serwist's handler would otherwise run
// (`dynamicParams = false` isn't available with Cache Components)
const WORKER = 'sw.js';

export async function generateStaticParams() {
  // Builds the worker ahead of the prerender (GET then has no async work left, so it's static)
  await route.generateStaticParams();
  return [{ path: WORKER }];
}

export async function GET(request: Request, context: { params: Promise<{ path: string }> }) {
  const { path } = await context.params;
  if (path !== WORKER) return new Response(null, { status: 404 });
  return route.GET(request, context);
}
