/**
 * NotificationService
 * Single entry point for all application notifications.
 * Orchestrates EmailService (SMTP) and WhatsAppService (Meta Cloud API).
 *
 * Every method is fire-and-forget: it never throws so calling controllers
 * are never blocked or failed by a notification error.
 *
 * WhatsApp template names used here must match approved templates in your
 * Meta Business Manager. Set them in .env or update the constants below.
 * Language code defaults to 'pt_BR' — update to 'pt_PT' if needed.
 */
import { EmailService } from './emailService';
import { WhatsAppService } from './whatsAppService';

const LANG = process.env.WHATSAPP_LANG || 'pt_BR';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Approved WhatsApp template names — configure in .env or change here
const WA_TEMPLATES = {
  INVITE:                process.env.WA_TEMPLATE_INVITE                || 'sonho_invite',
  WELCOME:               process.env.WA_TEMPLATE_WELCOME               || 'sonho_welcome',
  INVOICE_NEW:           process.env.WA_TEMPLATE_INVOICE_NEW           || 'sonho_invoice_new',
  INVOICE_OVERDUE:       process.env.WA_TEMPLATE_INVOICE_OVERDUE       || 'sonho_invoice_overdue',
  INVOICE_PAID:          process.env.WA_TEMPLATE_INVOICE_PAID          || 'sonho_invoice_paid',
  DAILY_REPORT:          process.env.WA_TEMPLATE_DAILY_REPORT          || 'sonho_daily_report',
  MONTHLY_REPORT:        process.env.WA_TEMPLATE_MONTHLY_REPORT        || 'sonho_monthly_report',
  NEW_MESSAGE:           process.env.WA_TEMPLATE_NEW_MESSAGE           || 'sonho_new_message',
  ATTENDANCE_CHECKIN:    process.env.WA_TEMPLATE_ATTENDANCE_CHECKIN    || 'sonho_attendance_checkin',
  ATTENDANCE_CHECKOUT:   process.env.WA_TEMPLATE_ATTENDANCE_CHECKOUT   || 'sonho_attendance_checkout',
  PASSWORD_RESET:        process.env.WA_TEMPLATE_PASSWORD_RESET        || 'sonho_password_reset',
};

const ROLE_LABELS: Record<string, string> = {
  responsavel: 'Encarregado de Educação',
  staff: 'Educador(a)',
  administrador: 'Administração'
};

export class NotificationService {
  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  static async welcome(params: {
    email: string;
    phone?: string;
    name: string;
    role: string;
  }): Promise<void> {
    await EmailService.send('welcome', params.email, 'Bem-vindo ao Sonho de Criança!', {
      name: params.name,
      role: params.role,
      loginLink: `${FRONTEND_URL}/login`
    });

    if (params.phone) {
      const to = WhatsAppService.normalisePhone(params.phone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.WELCOME, LANG, [
        { type: 'body', parameters: [{ type: 'text', text: params.name }] }
      ]);
    }
  }

  /** Link the frontend's accept-invite page opens with. */
  static inviteLink(inviteToken: string): string {
    return `${FRONTEND_URL}/convite/${inviteToken}`;
  }

  static async invite(params: {
    email: string;
    phone?: string;
    name: string;
    role: string;
    inviteToken: string;
    expiryDays: number;
  }): Promise<void> {
    const inviteLink = this.inviteLink(params.inviteToken);
    const roleLabel = ROLE_LABELS[params.role] || params.role;

    await EmailService.send('invite', params.email, 'Convite — Centro Infantil Sonho de Criança', {
      name: params.name,
      roleLabel,
      inviteLink,
      expiryDays: params.expiryDays
    });

    if (params.phone) {
      const to = WhatsAppService.normalisePhone(params.phone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.INVITE, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.name },
            { type: 'text', text: inviteLink }
          ]
        }
      ]);
    }
  }

  static async passwordReset(params: {
    email: string;
    phone?: string;
    name: string;
    resetToken: string;
  }): Promise<void> {
    const resetLink = `${FRONTEND_URL}/redefinir-senha?token=${params.resetToken}`;

    await EmailService.send('password-reset', params.email, 'Redefinição de senha — Sonho de Criança', {
      name: params.name,
      resetLink,
      expiryTime: '24 horas'
    });

    if (params.phone) {
      const to = WhatsAppService.normalisePhone(params.phone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.PASSWORD_RESET, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.name },
            { type: 'text', text: resetLink }
          ]
        }
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // Invoices
  // ---------------------------------------------------------------------------

  static async newInvoice(params: {
    parentEmail: string;
    parentPhone?: string;
    parentName: string;
    childName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
  }): Promise<void> {
    const amountFormatted = `${params.amount.toFixed(2)} MT`;
    const invoicesLink = `${FRONTEND_URL}/responsavel/faturamento`;

    await EmailService.send('invoice', params.parentEmail, `Nova fatura — ${params.childName}`, {
      parentName: params.parentName,
      childName: params.childName,
      invoiceNumber: params.invoiceNumber,
      amount: amountFormatted,
      dueDate: params.dueDate,
      invoicesLink
    });

    if (params.parentPhone) {
      const to = WhatsAppService.normalisePhone(params.parentPhone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.INVOICE_NEW, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.parentName },
            { type: 'text', text: params.childName },
            { type: 'text', text: params.invoiceNumber },
            { type: 'text', text: amountFormatted },
            { type: 'text', text: params.dueDate }
          ]
        }
      ]);
    }
  }

  static async invoiceOverdue(params: {
    parentEmail: string;
    parentPhone?: string;
    parentName: string;
    childName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
  }): Promise<void> {
    const amountFormatted = `${params.amount.toFixed(2)} MT`;
    const invoicesLink = `${FRONTEND_URL}/responsavel/faturamento`;

    await EmailService.send('invoice-overdue', params.parentEmail,
      `⚠️ Fatura vencida — ${params.childName}`, {
        parentName: params.parentName,
        childName: params.childName,
        invoiceNumber: params.invoiceNumber,
        amount: amountFormatted,
        dueDate: params.dueDate,
        invoicesLink
      });

    if (params.parentPhone) {
      const to = WhatsAppService.normalisePhone(params.parentPhone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.INVOICE_OVERDUE, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.parentName },
            { type: 'text', text: params.childName },
            { type: 'text', text: params.invoiceNumber },
            { type: 'text', text: amountFormatted },
            { type: 'text', text: params.dueDate }
          ]
        }
      ]);
    }
  }

  static async invoicePaid(params: {
    parentEmail: string;
    parentPhone?: string;
    parentName: string;
    childName: string;
    invoiceNumber: string;
    amount: number;
  }): Promise<void> {
    const amountFormatted = `${params.amount.toFixed(2)} MT`;

    await EmailService.send('invoice-paid', params.parentEmail,
      `✅ Pagamento confirmado — ${params.childName}`, {
        parentName: params.parentName,
        childName: params.childName,
        invoiceNumber: params.invoiceNumber,
        amount: amountFormatted,
        invoicesLink: `${FRONTEND_URL}/responsavel/faturamento`
      });

    if (params.parentPhone) {
      const to = WhatsAppService.normalisePhone(params.parentPhone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.INVOICE_PAID, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.parentName },
            { type: 'text', text: params.childName },
            { type: 'text', text: params.invoiceNumber },
            { type: 'text', text: amountFormatted }
          ]
        }
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // Daily reports
  // ---------------------------------------------------------------------------

  static async newDailyReport(params: {
    parentEmail: string;
    parentPhone?: string;
    parentName: string;
    childName: string;
    childId: string;
    reportDate: string;
    mood?: string;
  }): Promise<void> {
    const reportLink = `${FRONTEND_URL}/responsavel/relatorio/${params.childId}`;

    await EmailService.send('daily-report', params.parentEmail,
      `📋 Relatório diário — ${params.childName}`, {
        parentName: params.parentName,
        childName: params.childName,
        reportDate: params.reportDate,
        mood: params.mood || '',
        reportLink
      });

    if (params.parentPhone) {
      const to = WhatsAppService.normalisePhone(params.parentPhone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.DAILY_REPORT, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.parentName },
            { type: 'text', text: params.childName },
            { type: 'text', text: params.reportDate }
          ]
        }
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // Monthly reports
  // ---------------------------------------------------------------------------

  static async monthlyReportValidated(params: {
    parentEmail: string;
    parentPhone?: string;
    parentName: string;
    childName: string;
    childId: string;
    month: number;
    year: number;
  }): Promise<void> {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthLabel = `${monthNames[params.month - 1]} ${params.year}`;
    const reportLink = `${FRONTEND_URL}/responsavel/relatorios-mensais`;

    await EmailService.send('monthly-report', params.parentEmail,
      `📊 Relatório mensal validado — ${params.childName} (${monthLabel})`, {
        parentName: params.parentName,
        childName: params.childName,
        monthLabel,
        reportLink
      });

    if (params.parentPhone) {
      const to = WhatsAppService.normalisePhone(params.parentPhone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.MONTHLY_REPORT, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.parentName },
            { type: 'text', text: params.childName },
            { type: 'text', text: monthLabel }
          ]
        }
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  static async newMessage(params: {
    recipientEmail: string;
    recipientPhone?: string;
    recipientName: string;
    senderName: string;
    subject?: string;
    preview: string;
    role: string;
  }): Promise<void> {
    const inboxPath = params.role === 'responsavel' ? '/responsavel/mensagens'
      : params.role === 'staff' ? '/staff/mensagens'
      : '/admin/mensagens';
    const inboxLink = `${FRONTEND_URL}${inboxPath}`;

    await EmailService.send('new-message', params.recipientEmail,
      `💬 Nova mensagem${params.subject ? ` — ${params.subject}` : ''} — Sonho de Criança`, {
        recipientName: params.recipientName,
        senderName: params.senderName,
        subject: params.subject || 'Sem assunto',
        preview: params.preview.length > 200
          ? `${params.preview.slice(0, 200)}…`
          : params.preview,
        inboxLink
      });

    if (params.recipientPhone) {
      const to = WhatsAppService.normalisePhone(params.recipientPhone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.NEW_MESSAGE, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.recipientName },
            { type: 'text', text: params.senderName }
          ]
        }
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // Attendance
  // ---------------------------------------------------------------------------

  static async attendanceCheckIn(params: {
    parentEmail: string;
    parentPhone?: string;
    parentName: string;
    childName: string;
    checkInTime: string;
    date: string;
  }): Promise<void> {
    // Check-in notifications are brief — WhatsApp only, no email
    if (params.parentPhone) {
      const to = WhatsAppService.normalisePhone(params.parentPhone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.ATTENDANCE_CHECKIN, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.parentName },
            { type: 'text', text: params.childName },
            { type: 'text', text: params.checkInTime },
            { type: 'text', text: params.date }
          ]
        }
      ]);
    }
  }

  static async attendanceCheckOut(params: {
    parentEmail: string;
    parentPhone?: string;
    parentName: string;
    childName: string;
    checkOutTime: string;
    date: string;
  }): Promise<void> {
    if (params.parentPhone) {
      const to = WhatsAppService.normalisePhone(params.parentPhone);
      await WhatsAppService.sendTemplate(to, WA_TEMPLATES.ATTENDANCE_CHECKOUT, LANG, [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.parentName },
            { type: 'text', text: params.childName },
            { type: 'text', text: params.checkOutTime },
            { type: 'text', text: params.date }
          ]
        }
      ]);
    }
  }
}
