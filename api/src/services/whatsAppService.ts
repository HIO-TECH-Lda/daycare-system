/**
 * WhatsAppService
 * Sends WhatsApp messages via the Meta Cloud API.
 *
 * Prerequisites (Meta Business Manager):
 *   1. Create a WhatsApp Business Account (WABA)
 *   2. Add a phone number and get its Phone Number ID
 *   3. Generate a permanent System User access token
 *   4. Create and get approved message templates for transactional notifications
 *
 * Environment variables required:
 *   WHATSAPP_TOKEN        — Permanent access token from Meta
 *   WHATSAPP_PHONE_ID     — Phone Number ID from Meta (not the actual phone number)
 *   WHATSAPP_API_VERSION  — Meta Graph API version (default: v21.0)
 *
 * Phone numbers in the `to` field must be in international format without '+':
 *   e.g. "258841234567" for Mozambique +258 84 123 4567
 *
 * Two send modes:
 *   sendTemplate() — Sends a pre-approved template message (required for outbound/24h+ gaps)
 *   sendText()     — Sends a free-form text (only works within 24h of user-initiated contact)
 */

const META_GRAPH = 'https://graph.facebook.com';

function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

function apiVersion(): string {
  return process.env.WHATSAPP_API_VERSION || 'v21.0';
}

function messagesUrl(): string {
  return `${META_GRAPH}/${apiVersion()}/${process.env.WHATSAPP_PHONE_ID}/messages`;
}

async function post(body: object): Promise<void> {
  const res = await fetch(messagesUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`WhatsApp API error ${res.status}: ${detail}`);
  }
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

export class WhatsAppService {
  /**
   * Send a pre-approved template message.
   * `templateName` must match the approved template name in Meta Business Manager.
   * `components` supply the variable values for each placeholder in the template.
   */
  static async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components: WhatsAppTemplateComponent[] = []
  ): Promise<void> {
    if (!isWhatsAppConfigured()) {
      console.log(`[WhatsAppService] Not configured — skipping template "${templateName}" to ${to}`);
      return;
    }
    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode }
      }
    };
    if (components.length > 0) {
      payload.template.components = components;
    }
    try {
      await post(payload);
      console.log(`[WhatsAppService] Sent template "${templateName}" to ${to}`);
    } catch (err) {
      console.error(`[WhatsAppService] Failed to send template "${templateName}" to ${to}:`, err);
    }
  }

  /**
   * Send a plain text message.
   * Only works within a 24-hour customer service window (after the recipient messaged first).
   * Use sendTemplate() for proactive outbound notifications.
   */
  static async sendText(to: string, text: string): Promise<void> {
    if (!isWhatsAppConfigured()) {
      console.log(`[WhatsAppService] Not configured — skipping text message to ${to}`);
      return;
    }
    try {
      await post({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      });
      console.log(`[WhatsAppService] Sent text message to ${to}`);
    } catch (err) {
      console.error(`[WhatsAppService] Failed to send text to ${to}:`, err);
    }
  }

  /**
   * Normalise a phone number to Meta's expected format (digits only, no '+').
   * Strips spaces, dashes, parentheses, and leading '+'.
   */
  static normalisePhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    // Local Mozambican mobile (8X XXX XXXX) → add the +258 country code
    if (digits.length === 9 && digits.startsWith('8')) digits = `258${digits}`;
    return digits;
  }
}
