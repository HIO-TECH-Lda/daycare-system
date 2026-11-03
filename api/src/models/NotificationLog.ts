import mongoose, { Document, Schema } from 'mongoose';

/**
 * One row per message sent (or attempted) on one channel. WhatsApp rows are updated by Meta's
 * delivery webhooks (sent → delivered → read, or failed). The administration's "Notificações"
 * screen reads this log, and resends failed messages from the stored payload.
 *
 * Account messages (invites, password links) keep no payload: their links are credentials. They
 * are re-issued from Pessoas instead ("Reenviar convite", "link para nova palavra-passe").
 */
export type NotificationChannel = 'whatsapp' | 'email';
export type NotificationCategory = 'account' | 'enrollment' | 'billing' | 'reports' | 'attendance' | 'messages';
export type NotificationStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';

export interface WhatsAppPayload {
  template: string;
  language: string;
  body: string[];
  /** Dynamic suffix for the template's URL button */
  buttonSuffix?: string;
}

export interface EmailPayload {
  template: string;
  subject: string;
  context: Record<string, unknown>;
}

export interface INotificationLog {
  channel: NotificationChannel;
  category: NotificationCategory;
  /** WhatsApp template or email template name */
  template: string;
  /** E.164 phone number or email address */
  recipient: string;
  user_id?: mongoose.Types.ObjectId | null;
  status: NotificationStatus;
  error?: string;
  /** Meta's message id (wamid), to match delivery webhooks */
  provider_id?: string;
  attempts: number;
  payload?: { whatsapp?: WhatsAppPayload; email?: EmailPayload } | null;
  /** Email to fall back to if WhatsApp fails later (delivery webhook) */
  fallback_email?: string;
  /** This row is an email sent because the WhatsApp row failed / a resend of that row */
  fallback_of?: mongoose.Types.ObjectId | null;
  resend_of?: mongoose.Types.ObjectId | null;
  status_at?: Date;
  createdAt?: Date;
}

export interface INotificationLogDocument extends INotificationLog, Document {}

const notificationLogSchema = new Schema<INotificationLogDocument>(
  {
    channel: { type: String, enum: ['whatsapp', 'email'], required: true },
    category: { type: String, enum: ['account', 'enrollment', 'billing', 'reports', 'attendance', 'messages'], required: true },
    template: { type: String, required: true },
    recipient: { type: String, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['sent', 'delivered', 'read', 'failed', 'skipped'], required: true },
    error: { type: String, default: '' },
    provider_id: { type: String, default: undefined },
    attempts: { type: Number, default: 1 },
    payload: { type: Schema.Types.Mixed, default: null },
    fallback_email: { type: String, default: undefined },
    fallback_of: { type: Schema.Types.ObjectId, ref: 'NotificationLog', default: null },
    resend_of: { type: Schema.Types.ObjectId, ref: 'NotificationLog', default: null },
    status_at: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

notificationLogSchema.index({ status: 1, createdAt: -1 });
notificationLogSchema.index({ provider_id: 1 }, { sparse: true });
// Kept for six months
notificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60, name: 'expire_after_6_months' });

export default mongoose.model<INotificationLogDocument>('NotificationLog', notificationLogSchema);
