/**
 * WhatsAppService
 * Sends template messages through the Meta WhatsApp Cloud API.
 *
 * Environment:
 *   WHATSAPP_TOKEN        Permanent system-user access token
 *   WHATSAPP_PHONE_ID     Phone Number ID (not the phone number itself)
 *   WHATSAPP_API_VERSION  Graph API version (default v23.0; Meta supports each for about two years)
 *
 * Business-initiated messages must use templates approved in Meta Business Manager (see
 * docs/WHATSAPP-TEMPLATES.md). Links go in a URL button with a dynamic suffix rather than in the
 * text, which Meta handles better.
 */

import { normalisePhone } from '../utils/phone';

const META_GRAPH = 'https://graph.facebook.com';
// Give up on a slow Meta API instead of holding the background task open
const REQUEST_TIMEOUT_MS = 10_000;
// Temporary failures (network, rate limit, Meta errors): 3 attempts in all
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = process.env.NODE_ENV === 'test' ? [0, 0] : [1_000, 3_000];

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

function messagesUrl(): string {
  return `${META_GRAPH}/${process.env.WHATSAPP_API_VERSION || 'v23.0'}/${process.env.WHATSAPP_PHONE_ID}/messages`;
}

export interface TemplateMessage {
  template: string;
  language: string;
  /** Values for {{1}}, {{2}}… in the template body */
  body: string[];
  /** Dynamic part of the template's URL button (e.g. the invite token) */
  buttonSuffix?: string;
}

export interface SendResult {
  ok: boolean;
  /** Meta's message id (wamid), matched later by the delivery webhook */
  messageId?: string;
  error?: string;
  attempts: number;
}

/** Network errors, timeouts, rate limits and Meta's own errors are worth retrying; the rest aren't. */
function isTransient(status: number | null): boolean {
  return status === null || status === 429 || status >= 500;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WhatsAppService {
  /** Sends an approved template; never throws. Retries temporary failures (3 attempts in all). */
  static async sendTemplate(to: string, message: TemplateMessage): Promise<SendResult> {
    if (!isWhatsAppConfigured()) return { ok: false, error: 'WhatsApp não configurado', attempts: 0 };

    const components: object[] = [];
    if (message.body.length) components.push({ type: 'body', parameters: message.body.map((text) => ({ type: 'text', text })) });
    if (message.buttonSuffix) components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: message.buttonSuffix }] });
    const payload = {
      messaging_product: 'whatsapp',
      to: this.normalisePhone(to),
      type: 'template',
      template: { name: message.template, language: { code: message.language }, ...(components.length && { components }) }
    };

    let lastError = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let status: number | null = null;
      try {
        const res = await fetch(messagesUrl(), {
          method: 'POST',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        status = res.status;
        const data = (await res.json().catch(() => null)) as { messages?: { id: string }[]; error?: { code?: number; message?: string } } | null;
        if (res.ok) return { ok: true, messageId: data?.messages?.[0]?.id, attempts: attempt };
        lastError = `Meta ${res.status}${data?.error?.code ? ` (${data.error.code})` : ''}: ${data?.error?.message ?? 'erro desconhecido'}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      if (!isTransient(status) || attempt === MAX_ATTEMPTS) return { ok: false, error: lastError, attempts: attempt };
      await wait(BACKOFF_MS[attempt - 1] ?? 3_000);
    }
    return { ok: false, error: lastError, attempts: MAX_ATTEMPTS };
  }

  /**
   * Format a phone number the way Meta expects it: country code + number, digits only.
   * Local Mozambican numbers get the 258 country code (see utils/phone).
   */
  static normalisePhone(phone: string): string {
    const e164 = normalisePhone(phone);
    return e164 ? e164.slice(1) : phone.replace(/\D/g, '');
  }
}
