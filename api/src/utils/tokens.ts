import crypto from 'crypto';

/** One-time tokens (invites, password resets): the raw token goes to the user, only the hash is stored. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOneTimeToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}
