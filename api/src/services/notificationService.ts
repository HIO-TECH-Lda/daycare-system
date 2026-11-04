/**
 * NotificationService
 * Every message the centre sends (WhatsApp and email) goes through deliver(), which:
 * - picks the channels: WhatsApp only with the person's recorded consent, then their per-category
 *   preferences (attendance, reports, billing, messages); account and enrolment messages always go;
 * - records each send in NotificationLog (the administration's "Notificações" screen);
 * - falls back to email when WhatsApp fails (now, or later through the delivery webhook), except
 *   for check-in/check-out, which are too frequent to turn into emails.
 *
 * Methods never throw, so callers are never failed by a notification error. Controllers run them
 * with runInBackground(), so on Vercel they finish after the response.
 *
 * WhatsApp template names and their text: docs/WHATSAPP-TEMPLATES.md. They must match the
 * templates approved in Meta Business Manager.
 */
import { EmailService, isEmailConfigured } from './emailService';
import { WhatsAppService, type TemplateMessage } from './whatsAppService';
import NotificationLog, { type EmailPayload, type NotificationCategory, type INotificationLogDocument } from '../models/NotificationLog';
import User from '../models/User';
import type { ChannelPrefs, PrefCategory } from '../types';
import { normalisePhone } from '../utils/phone';

const LANG = process.env.WHATSAPP_LANG || 'pt_PT';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Approved WhatsApp template names: configure in .env or change here
const WA_TEMPLATES = {
  INVITE:                process.env.WA_TEMPLATE_INVITE                || 'sonho_invite',
  INVOICE_NEW:           process.env.WA_TEMPLATE_INVOICE_NEW           || 'sonho_invoice_new',
  INVOICE_OVERDUE:       process.env.WA_TEMPLATE_INVOICE_OVERDUE       || 'sonho_invoice_overdue',
  INVOICE_PAID:          process.env.WA_TEMPLATE_INVOICE_PAID          || 'sonho_invoice_paid',
  DAILY_REPORT:          process.env.WA_TEMPLATE_DAILY_REPORT          || 'sonho_daily_report',
  MONTHLY_REPORT:        process.env.WA_TEMPLATE_MONTHLY_REPORT        || 'sonho_monthly_report',
  NEW_MESSAGE:           process.env.WA_TEMPLATE_NEW_MESSAGE           || 'sonho_new_message',
  ATTENDANCE_CHECKIN:    process.env.WA_TEMPLATE_ATTENDANCE_CHECKIN    || 'sonho_attendance_checkin',
  ATTENDANCE_CHECKOUT:   process.env.WA_TEMPLATE_ATTENDANCE_CHECKOUT   || 'sonho_attendance_checkout',
  PASSWORD_RESET:        process.env.WA_TEMPLATE_PASSWORD_RESET        || 'sonho_password_reset',
  ENROLLMENT_RECEIVED:   process.env.WA_TEMPLATE_ENROLLMENT_RECEIVED   || 'sonho_enrollment_received',
  ENROLLMENT_APPROVED:   process.env.WA_TEMPLATE_ENROLLMENT_APPROVED   || 'sonho_enrollment_approved',
};

const ROLE_LABELS: Record<string, string> = {
  responsavel: 'Encarregado de Educação',
  staff: 'Educador',
  administrador: 'Administração'
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Defaults: everything on both channels, except check-in/out by email (several a day). */
export const DEFAULT_PREFS: Record<PrefCategory, ChannelPrefs> = {
  attendance: { whatsapp: true, email: false },
  reports: { whatsapp: true, email: true },
  billing: { whatsapp: true, email: true },
  messages: { whatsapp: true, email: true }
};
const PREF_CATEGORIES = Object.keys(DEFAULT_PREFS) as PrefCategory[];

/** Which channels a message actually went out on. */
export interface Delivery {
  email: boolean;
  whatsapp: boolean;
}

/** The parts of a user a notification needs (a User document fits). */
export interface NotifyUser {
  _id?: unknown;
  firstName?: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  whatsappOptIn?: boolean;
  notificationPrefs?: Partial<Record<PrefCategory, Partial<ChannelPrefs>>>;
}

interface Recipients {
  userId?: string;
  email?: string;
  whatsapp?: string;
  /** Where to send an email if WhatsApp fails (when email wasn't chosen already) */
  fallbackEmail?: string;
}

function money(amount: number): string {
  return `${new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions).format(amount)} MT`;
}

function displayName(user: NotifyUser): string {
  return user.fullName || user.firstName || '';
}

export class NotificationService {
  /** The user's WhatsApp number, or undefined when they haven't consented to WhatsApp messages. */
  static whatsAppNumberFor(user: { phone?: string | null; whatsappOptIn?: boolean }): string | undefined {
    return user.phone && user.whatsappOptIn ? user.phone : undefined;
  }

  /** The person's preferences, with the defaults filled in. */
  static prefsFor(user: Pick<NotifyUser, 'notificationPrefs'>): Record<PrefCategory, ChannelPrefs> {
    return Object.fromEntries(PREF_CATEGORIES.map((category) => [category, { ...DEFAULT_PREFS[category], ...user.notificationPrefs?.[category] }])) as Record<PrefCategory, ChannelPrefs>;
  }

  /** Channels for this person and kind of message: consent first, then their preferences. */
  static channelsFor(user: NotifyUser, category: NotificationCategory): Recipients {
    const prefs = (PREF_CATEGORIES as string[]).includes(category) ? this.prefsFor(user)[category as PrefCategory] : { whatsapp: true, email: true };
    const email = user.email || undefined;
    const whatsapp = prefs.whatsapp ? this.whatsAppNumberFor(user) : undefined;
    return {
      userId: user._id ? String(user._id) : undefined,
      email: prefs.email ? email : undefined,
      whatsapp,
      fallbackEmail: category !== 'attendance' && !prefs.email ? email : undefined
    };
  }

  /** Link the frontend's accept-invite page opens with. */
  static inviteLink(inviteToken: string): string {
    return `${FRONTEND_URL}/convite/${inviteToken}`;
  }

  /** Link the frontend's reset-password page opens with. */
  static passwordResetLink(resetToken: string): string {
    return `${FRONTEND_URL}/redefinir-senha?token=${resetToken}`;
  }

  // ---------------------------------------------------------------------------
  // Delivery and log
  // ---------------------------------------------------------------------------

  private static async log(row: Record<string, unknown>): Promise<INotificationLogDocument | null> {
    try {
      return await NotificationLog.create(row);
    } catch (err) {
      console.error('[NotificationService] Could not record a notification:', err);
      return null;
    }
  }

  private static async sendEmail(category: NotificationCategory, to: string, email: EmailPayload, userId?: string, links?: { fallback_of?: unknown; resend_of?: unknown }): Promise<boolean> {
    const ok = await EmailService.send(email.template, to, email.subject, email.context);
    await this.log({
      channel: 'email',
      category,
      template: email.template,
      recipient: to,
      user_id: userId ?? null,
      status: ok ? 'sent' : isEmailConfigured() ? 'failed' : 'skipped',
      error: ok ? '' : isEmailConfigured() ? 'Falha no envio por SMTP' : 'Email não configurado',
      // Account emails carry credentials (invite, password links): not kept
      payload: category === 'account' ? null : { email },
      ...links
    });
    return ok;
  }

  private static async sendWhatsApp(
    category: NotificationCategory,
    to: string,
    message: TemplateMessage,
    userId?: string,
    fallback?: { email: string; payload: EmailPayload },
    links?: { resend_of?: unknown }
  ): Promise<boolean> {
    const result = await WhatsAppService.sendTemplate(to, message);
    await this.log({
      channel: 'whatsapp',
      category,
      template: message.template,
      recipient: normalisePhone(to) ?? to,
      user_id: userId ?? null,
      status: result.ok ? 'sent' : result.attempts > 0 ? 'failed' : 'skipped',
      error: result.error ?? '',
      provider_id: result.messageId,
      attempts: Math.max(1, result.attempts),
      payload: category === 'account' ? null : { whatsapp: message, ...(fallback && { email: fallback.payload }) },
      fallback_email: result.ok && fallback ? fallback.email : undefined,
      ...links
    });
    return result.ok;
  }

  /** Sends on the chosen channels, records each send, and falls back to email if WhatsApp fails. */
  private static async deliver(category: NotificationCategory, to: Recipients, content: { whatsapp?: TemplateMessage; email?: EmailPayload }): Promise<Delivery> {
    try {
      const fallback = to.fallbackEmail && content.email ? { email: to.fallbackEmail, payload: content.email } : undefined;
      const whatsapp = to.whatsapp && content.whatsapp ? await this.sendWhatsApp(category, to.whatsapp, content.whatsapp, to.userId, fallback) : false;
      let email = to.email && content.email ? await this.sendEmail(category, to.email, content.email, to.userId) : false;
      if (to.whatsapp && !whatsapp && !to.email && fallback) {
        email = await this.sendEmail(category, fallback.email, fallback.payload, to.userId);
      }
      return { email, whatsapp };
    } catch (err) {
      console.error(`[NotificationService] ${category} notification failed:`, err);
      return { email: false, whatsapp: false };
    }
  }

  // ---------------------------------------------------------------------------
  // Delivery webhook and resend
  // ---------------------------------------------------------------------------

  /**
   * A WhatsApp status from Meta's webhook. Statuses only move forward (sent → delivered → read);
   * a failure later on sends the email fallback once.
   */
  static async recordWhatsAppStatus(update: { id: string; status: string; errors?: { code?: number; title?: string; message?: string }[] }): Promise<void> {
    const order = ['sent', 'delivered', 'read'];
    const row = await NotificationLog.findOne({ provider_id: update.id, channel: 'whatsapp' });
    if (!row) return;
    if (update.status === 'failed') {
      if (row.status === 'failed') return;
      const error = update.errors?.[0];
      row.set({ status: 'failed', status_at: new Date(), error: error ? `Meta ${error.code ?? ''}: ${error.message || error.title || 'falhou'}`.trim() : 'Falhou' });
      await row.save();
      if (row.fallback_email && row.payload?.email && !(await NotificationLog.exists({ fallback_of: row._id }))) {
        await this.sendEmail(row.category, row.fallback_email, row.payload.email, row.user_id ? String(row.user_id) : undefined, { fallback_of: row._id });
      }
      return;
    }
    if (order.indexOf(update.status) > order.indexOf(row.status)) {
      row.set({ status: update.status, status_at: new Date() });
      await row.save();
    }
  }

  /**
   * Sends a failed (or skipped) message again from its stored payload. WhatsApp is re-checked
   * against the person's current consent. Account messages have no payload: they are re-issued
   * from Pessoas instead.
   */
  static async resend(logId: string): Promise<{ ok: boolean; reason?: string }> {
    const row = await NotificationLog.findById(logId);
    if (!row) return { ok: false, reason: 'Notificação não encontrada' };
    if (row.channel === 'whatsapp' && row.payload?.whatsapp) {
      const user = row.user_id ? await User.findById(row.user_id) : null;
      if (user && !this.whatsAppNumberFor(user)) return { ok: false, reason: 'A pessoa já não aceita WhatsApp' };
      const ok = await this.sendWhatsApp(row.category, user?.phone ?? row.recipient, row.payload.whatsapp, row.user_id ? String(row.user_id) : undefined, undefined, { resend_of: row._id });
      return ok ? { ok } : { ok, reason: 'Falhou de novo (ver o registo)' };
    }
    if (row.channel === 'email' && row.payload?.email) {
      const ok = await this.sendEmail(row.category, row.recipient, row.payload.email, row.user_id ? String(row.user_id) : undefined, { resend_of: row._id });
      return ok ? { ok } : { ok, reason: 'Falhou de novo (ver o registo)' };
    }
    return { ok: false, reason: 'Convites e links de palavra-passe reenviam-se em Pessoas' };
  }

  // ---------------------------------------------------------------------------
  // Account
  // ---------------------------------------------------------------------------

  static async invite(params: { user: NotifyUser; inviteToken: string; expiryDays: number }): Promise<Delivery> {
    const { user } = params;
    const roleLabel = ROLE_LABELS[user.role ?? ''] || user.role || '';
    return this.deliver('account', this.channelsFor(user, 'account'), {
      email: {
        template: 'invite',
        subject: 'Convite — Centro Infantil Sonho de Criança',
        context: { name: user.firstName, roleLabel, inviteLink: this.inviteLink(params.inviteToken), expiryDays: params.expiryDays }
      },
      whatsapp: { template: WA_TEMPLATES.INVITE, language: LANG, body: [user.firstName ?? '', roleLabel], buttonSuffix: params.inviteToken }
    });
  }

  static async passwordReset(params: { user: NotifyUser; resetToken: string }): Promise<Delivery> {
    const { user } = params;
    return this.deliver('account', this.channelsFor(user, 'account'), {
      email: {
        template: 'password-reset',
        subject: 'Nova palavra-passe — Sonho de Criança',
        context: { name: user.firstName, resetLink: this.passwordResetLink(params.resetToken), expiryTime: '24 horas' }
      },
      whatsapp: { template: WA_TEMPLATES.PASSWORD_RESET, language: LANG, body: [user.firstName ?? ''], buttonSuffix: params.resetToken }
    });
  }

  // ---------------------------------------------------------------------------
  // Invoices
  // ---------------------------------------------------------------------------

  static async newInvoice(params: { parent: NotifyUser; childName: string; invoiceNumber: string; amount: number; dueDate: string }): Promise<Delivery> {
    const { parent } = params;
    return this.deliver('billing', this.channelsFor(parent, 'billing'), {
      email: {
        template: 'invoice',
        subject: `Nova factura — ${params.childName}`,
        context: { parentName: displayName(parent), childName: params.childName, invoiceNumber: params.invoiceNumber, amount: money(params.amount), dueDate: params.dueDate, invoicesLink: `${FRONTEND_URL}/responsavel/facturacao` }
      },
      whatsapp: { template: WA_TEMPLATES.INVOICE_NEW, language: LANG, body: [parent.firstName ?? '', params.invoiceNumber, params.childName, money(params.amount), params.dueDate] }
    });
  }

  static async invoiceOverdue(params: { parent: NotifyUser; childName: string; invoiceNumber: string; amount: number; dueDate: string }): Promise<Delivery> {
    const { parent } = params;
    return this.deliver('billing', this.channelsFor(parent, 'billing'), {
      email: {
        template: 'invoice-overdue',
        subject: `Factura em atraso — ${params.childName}`,
        context: { parentName: displayName(parent), childName: params.childName, invoiceNumber: params.invoiceNumber, amount: money(params.amount), dueDate: params.dueDate, invoicesLink: `${FRONTEND_URL}/responsavel/facturacao` }
      },
      whatsapp: { template: WA_TEMPLATES.INVOICE_OVERDUE, language: LANG, body: [parent.firstName ?? '', params.invoiceNumber, params.childName, money(params.amount), params.dueDate] }
    });
  }

  static async invoicePaid(params: { parent: NotifyUser; childName: string; invoiceNumber: string; amount: number }): Promise<Delivery> {
    const { parent } = params;
    return this.deliver('billing', this.channelsFor(parent, 'billing'), {
      email: {
        template: 'invoice-paid',
        subject: `Pagamento confirmado — ${params.childName}`,
        context: { parentName: displayName(parent), childName: params.childName, invoiceNumber: params.invoiceNumber, amount: money(params.amount), invoicesLink: `${FRONTEND_URL}/responsavel/facturacao` }
      },
      whatsapp: { template: WA_TEMPLATES.INVOICE_PAID, language: LANG, body: [parent.firstName ?? '', money(params.amount), params.invoiceNumber, params.childName] }
    });
  }

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------

  static async newDailyReport(params: { parent: NotifyUser; childName: string; reportDate: string; mood?: string }): Promise<Delivery> {
    const { parent } = params;
    return this.deliver('reports', this.channelsFor(parent, 'reports'), {
      email: {
        template: 'daily-report',
        subject: `Relatório do dia — ${params.childName}`,
        context: { parentName: displayName(parent), childName: params.childName, reportDate: params.reportDate, mood: params.mood || '', reportLink: `${FRONTEND_URL}/responsavel` }
      },
      whatsapp: { template: WA_TEMPLATES.DAILY_REPORT, language: LANG, body: [parent.firstName ?? '', params.childName, params.reportDate] }
    });
  }

  static async monthlyReportValidated(params: { parent: NotifyUser; childName: string; month: number; year: number }): Promise<Delivery> {
    const { parent } = params;
    const monthLabel = `${MONTHS[params.month - 1]} ${params.year}`;
    return this.deliver('reports', this.channelsFor(parent, 'reports'), {
      email: {
        template: 'monthly-report',
        subject: `Relatório mensal — ${params.childName} (${monthLabel})`,
        context: { parentName: displayName(parent), childName: params.childName, monthLabel, reportLink: `${FRONTEND_URL}/responsavel/relatorios` }
      },
      whatsapp: { template: WA_TEMPLATES.MONTHLY_REPORT, language: LANG, body: [parent.firstName ?? '', params.childName, monthLabel] }
    });
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  static async newMessage(params: { recipient: NotifyUser; senderName: string; subject?: string; preview: string }): Promise<Delivery> {
    const { recipient } = params;
    const inboxPath = recipient.role === 'responsavel' ? '/responsavel/mensagens' : recipient.role === 'staff' ? '/staff/mensagens' : '/admin/mensagens';
    return this.deliver('messages', this.channelsFor(recipient, 'messages'), {
      email: {
        template: 'new-message',
        subject: `Nova mensagem${params.subject ? ` — ${params.subject}` : ''} — Sonho de Criança`,
        context: {
          recipientName: displayName(recipient),
          senderName: params.senderName,
          subject: params.subject || 'Sem assunto',
          preview: params.preview.length > 200 ? `${params.preview.slice(0, 200)}…` : params.preview,
          inboxLink: `${FRONTEND_URL}${inboxPath}`
        }
      },
      whatsapp: { template: WA_TEMPLATES.NEW_MESSAGE, language: LANG, body: [recipient.firstName ?? '', params.senderName] }
    });
  }

  // ---------------------------------------------------------------------------
  // Attendance (WhatsApp by default; email only if the family asks for it)
  // ---------------------------------------------------------------------------

  static async attendanceCheckIn(params: { parent: NotifyUser; childName: string; checkInTime: string; date: string }): Promise<Delivery> {
    const { parent } = params;
    return this.deliver('attendance', this.channelsFor(parent, 'attendance'), {
      whatsapp: { template: WA_TEMPLATES.ATTENDANCE_CHECKIN, language: LANG, body: [parent.firstName ?? '', params.childName, params.checkInTime, params.date] }
    });
  }

  static async attendanceCheckOut(params: { parent: NotifyUser; childName: string; checkOutTime: string; date: string }): Promise<Delivery> {
    const { parent } = params;
    return this.deliver('attendance', this.channelsFor(parent, 'attendance'), {
      whatsapp: { template: WA_TEMPLATES.ATTENDANCE_CHECKOUT, language: LANG, body: [parent.firstName ?? '', params.childName, params.checkOutTime, params.date] }
    });
  }

  // ---------------------------------------------------------------------------
  // Enrolment (the family has no account yet: the form's contacts and WhatsApp consent)
  // ---------------------------------------------------------------------------

  /** Confirmation to the family that their enrolment request arrived. */
  static async enrollmentReceived(params: { email?: string; whatsappPhone?: string; guardianName: string; childName: string; reference: string }): Promise<Delivery> {
    return this.deliver('enrollment', { email: params.email, whatsapp: params.whatsappPhone }, {
      email: {
        template: 'enrollment-received',
        subject: `Pedido de matrícula recebido — ${params.childName}`,
        context: { name: params.guardianName, childName: params.childName, reference: params.reference }
      },
      whatsapp: { template: WA_TEMPLATES.ENROLLMENT_RECEIVED, language: LANG, body: [params.guardianName, params.childName, params.reference] }
    });
  }

  /** Tells the family the enrolment was approved (account invites are sent separately). */
  static async enrollmentApproved(params: { email?: string; whatsappPhone?: string; guardianName: string; childName: string; className: string; startDate: string }): Promise<Delivery> {
    return this.deliver('enrollment', { email: params.email, whatsapp: params.whatsappPhone }, {
      email: {
        template: 'enrollment-approved',
        subject: `Matrícula aprovada — ${params.childName}`,
        context: { name: params.guardianName, childName: params.childName, className: params.className, startDate: params.startDate }
      },
      whatsapp: { template: WA_TEMPLATES.ENROLLMENT_APPROVED, language: LANG, body: [params.guardianName, params.childName, params.className, params.startDate] }
    });
  }
}
