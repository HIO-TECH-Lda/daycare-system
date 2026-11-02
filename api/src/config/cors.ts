import { CorsOptions } from 'cors';

/**
 * Allowed browser origins come from CORS_ORIGINS (comma-separated).
 * An entry may contain `*` as a wildcard, e.g. `https://deploy-preview-*--sonho.netlify.app`.
 * When CORS_ORIGINS is not set, every origin is allowed outside production
 * and none in production (requests without an Origin header, like curl or cron, are unaffected).
 */
function originPatterns(): RegExp[] {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
    .map((o) => new RegExp('^' + o.split('*').map(escapeRegExp).join('[^/]*') + '$'));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isOriginAllowed(origin: string): boolean {
  const patterns = originPatterns();
  if (patterns.length === 0) return process.env.NODE_ENV !== 'production';
  return patterns.some((p) => p.test(origin));
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    callback(null, !origin || isOriginAllowed(origin));
  }
};
