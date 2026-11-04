import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';

/**
 * Meta WhatsApp delivery webhook (Meta App → WhatsApp → Configuration):
 * - callback URL: <API>/api/v1/webhooks/whatsapp, verify token: WHATSAPP_VERIFY_TOKEN;
 * - subscribe to the "messages" field.
 * Every POST is signed with the app secret (X-Hub-Signature-256), checked against the raw body.
 * Without WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET the webhook is disabled (503).
 */
const router = Router();

type StatusUpdate = { id: string; status: string; errors?: { code?: number; title?: string; message?: string }[] };
type WebhookBody = { entry?: { changes?: { value?: { statuses?: StatusUpdate[] } }[] }[] };

// Verification handshake when the webhook is set up in Meta
router.get('/whatsapp', (req: Request, res: Response) => {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!token) return res.status(503).send('Webhook desactivado');
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === token) {
    return res.status(200).type('text/plain').send(String(req.query['hub.challenge'] ?? ''));
  }
  return res.sendStatus(403);
});

function validSignature(req: Request, secret: string): boolean {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  const header = req.get('x-hub-signature-256') ?? '';
  if (!raw || !header.startsWith('sha256=')) return false;
  const given = Buffer.from(header.slice(7), 'hex');
  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

router.post('/whatsapp', catchAsync(async (req: Request, res: Response) => {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !process.env.WHATSAPP_VERIFY_TOKEN) return res.status(503).json({ success: false, message: 'Webhook desactivado' });
  if (!validSignature(req, secret)) return res.status(401).json({ success: false, message: 'Assinatura inválida' });

  const statuses = ((req.body as WebhookBody).entry ?? []).flatMap((entry) => (entry.changes ?? []).flatMap((change) => change.value?.statuses ?? []));
  // In order: Meta can send "sent" and "delivered" in the same batch
  for (const update of statuses) {
    if (update?.id && update.status) await NotificationService.recordWhatsAppStatus(update);
  }
  return res.sendStatus(200);
}));

export default router;
