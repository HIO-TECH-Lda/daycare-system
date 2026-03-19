/**
 * EmailService
 * Sends HTML emails via SMTP (nodemailer) using Handlebars templates.
 * All templates live in src/templates/emails/<name>.hbs
 *
 * Usage:
 *   await EmailService.send('invoice', to, 'Nova fatura disponível', { ...vars });
 *
 * Silently logs and skips when SMTP credentials are not configured so the app
 * never crashes in dev environments without email set up.
 */
import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';

const TEMPLATES_DIR = path.join(__dirname, '../templates/emails');

// Compile and cache templates
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

function loadTemplate(name: string): HandlebarsTemplateDelegate {
  if (templateCache.has(name)) return templateCache.get(name)!;
  const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
  if (!fs.existsSync(filePath)) throw new Error(`Email template not found: ${name}.hbs`);
  const source = fs.readFileSync(filePath, 'utf-8');
  const compiled = Handlebars.compile(source);
  templateCache.set(name, compiled);
  return compiled;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export class EmailService {
  static async send(
    template: string,
    to: string | string[],
    subject: string,
    context: Record<string, unknown>
  ): Promise<void> {
    if (!isEmailConfigured()) {
      console.log(`[EmailService] SMTP not configured — skipping email "${subject}" to ${to}`);
      return;
    }
    try {
      const html = loadTemplate(template)({
        ...context,
        appName: 'Sonho de Criança',
        appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        year: new Date().getFullYear()
      });

      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Sonho de Criança" <${process.env.SMTP_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html
      });
      console.log(`[EmailService] Sent "${subject}" to ${to}`);
    } catch (err) {
      console.error(`[EmailService] Failed to send "${subject}" to ${to}:`, err);
    }
  }
}
