import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const tooMany = (message: string) => ({ success: false, message });
// Tests make many auth calls from one address; limits are not under test there
const skip = () => process.env.NODE_ENV === 'test';

/**
 * Login: counts only failed attempts, so staff sharing the centre's network
 * (one public IP) aren't locked out by each other's successful logins.
 */
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 20,
  skipSuccessfulRequests: true,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Demasiadas tentativas de entrada. Tente novamente dentro de 15 minutos.')
});

/** Password reset, invite lookup and invite acceptance. */
export const sensitiveAuthLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Demasiados pedidos. Tente novamente dentro de 15 minutos.')
});
