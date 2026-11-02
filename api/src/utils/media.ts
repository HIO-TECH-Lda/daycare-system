import crypto from 'crypto';

/**
 * Children's photos (and the other private files below) are never given out as their storage URL.
 * The API returns its own signed, short-lived link instead: /api/v1/media/<kind>/<id>?exp=…&sig=…
 * Only users allowed to see the record receive the link (the record endpoints are scoped by role),
 * and an <img> can load it without sending the login token. The media endpoint checks the
 * signature and serves the file from private storage.
 */
export const MEDIA_KINDS = ['children', 'report-photos', 'pickup-persons', 'receipts'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

const WINDOW_SECONDS = 60 * 60;
const MEDIA_PATH = '/api/v1/media/';

function secret(): string {
  return process.env.MEDIA_URL_SECRET
    || crypto.createHmac('sha256', process.env.JWT_SECRET || '').update('media-urls').digest('hex');
}

function sign(kind: string, id: string, exp: number): string {
  return crypto.createHmac('sha256', secret()).update(`${kind}/${id}/${exp}`).digest('base64url');
}

function apiBaseUrl(): string {
  return (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3002}`).replace(/\/$/, '');
}

/**
 * Signed link to a record's file. Valid for 1–2 hours; the same link is issued throughout an
 * hour, so browsers can cache the image.
 */
export function mediaUrl(kind: MediaKind, id: unknown): string {
  const exp = (Math.floor(Date.now() / 1000 / WINDOW_SECONDS) + 2) * WINDOW_SECONDS;
  const recordId = String(id);
  return `${apiBaseUrl()}${MEDIA_PATH}${kind}/${recordId}?exp=${exp}&sig=${sign(kind, recordId, exp)}`;
}

/** Seconds the link is still valid for, or null when the signature is wrong or the link expired. */
export function verifyMediaLink(kind: string, id: string, exp: unknown, sig: unknown): number | null {
  const expiry = Number(exp);
  if (!Number.isInteger(expiry) || typeof sig !== 'string') return null;
  const remaining = expiry - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return null;

  const expected = Buffer.from(sign(kind, id, expiry));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given) ? remaining : null;
}

/** True for links produced by mediaUrl() (clients may echo them back when updating a record). */
export function isMediaUrl(value: unknown): boolean {
  return typeof value === 'string' && value.includes(MEDIA_PATH);
}

/** toJSON transform for a schema: replaces the stored file URL with a signed media link. */
export function mediaJsonTransform(kind: MediaKind, field: string) {
  return (_doc: unknown, ret: Record<string, any>) => {
    if (ret[field] && ret._id) ret[field] = mediaUrl(kind, ret._id);
    return ret;
  };
}
