import rateLimit, { Options } from 'express-rate-limit';
import { Request } from 'express';
import { MongoRateLimitStore } from './rateLimitStore';
import { identifierFilter } from '../services/authService';

const MINUTE = 60 * 1000;
const tooMany = (message: string) => ({ success: false, message });
const TRY_LATER = 'Demasiados pedidos. Tente novamente mais tarde.';
// Tests make many auth calls from one address; limits are not under test there
const skip = () => process.env.NODE_ENV === 'test';

/**
 * In production the counters live in MongoDB, so all serverless instances share them;
 * elsewhere the default in-memory store is used.
 */
function limiter(name: string, options: Partial<Options>) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    ...(process.env.NODE_ENV === 'production' ? { store: new MongoRateLimitStore(name) } : {}),
    ...options
  });
}

/** The account a request is about (normalised email or phone), for per-account limits. */
function accountKey(req: Request): string {
  const raw = String(req.body?.identifier ?? req.body?.email ?? '');
  const filter = identifierFilter(raw);
  return filter ? Object.values(filter)[0] : `raw:${raw.trim().toLowerCase()}`;
}

/**
 * Login: counts only failed attempts per IP, so staff sharing the centre's network
 * (one public IP) aren't locked out by each other's successful logins.
 */
export const loginLimiter = limiter('login', {
  windowMs: 15 * MINUTE,
  max: 20,
  skipSuccessfulRequests: true,
  message: tooMany('Demasiadas tentativas de entrada. Tente novamente dentro de 15 minutos.')
});

/**
 * Invite lookup and acceptance: counted per invite link, not per IP, so many people
 * activating their accounts on the centre's Wi-Fi don't block each other.
 * (Links are 256-bit random tokens: guessing them is not a concern.)
 */
export const inviteLimiter = limiter('invite', {
  windowMs: 15 * MINUTE,
  max: 30,
  keyGenerator: (req) => String(req.params.token || req.body?.token || req.ip),
  message: tooMany(TRY_LATER)
});

/** Forgot password, per IP. */
export const forgotPasswordIpLimiter = limiter('forgot-ip', {
  windowMs: 15 * MINUTE,
  max: 30,
  message: tooMany(TRY_LATER)
});

/** Forgot password, per account: stops anyone flooding a person's WhatsApp or inbox with reset messages. */
export const forgotPasswordAccountLimiter = limiter('forgot-account', {
  windowMs: 60 * MINUTE,
  max: 3,
  keyGenerator: accountKey,
  message: tooMany(TRY_LATER)
});

/** Submitting a new password with a reset link: per link. */
export const resetPasswordLimiter = limiter('reset', {
  windowMs: 15 * MINUTE,
  max: 10,
  keyGenerator: (req) => String(req.body?.token || req.ip),
  message: tooMany(TRY_LATER)
});
