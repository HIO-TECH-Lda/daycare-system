import crypto from 'crypto';
import request from 'supertest';
import { app } from '../app';
import Class from '../models/Class';
import Child from '../models/Child';
import Invoice from '../models/Invoice';
import NotificationLog from '../models/NotificationLog';
import { IUserDocument } from '../models/User';
import { EmailService } from '../services/emailService';
import { WhatsAppService } from '../services/whatsAppService';
import { NotificationService } from '../services/notificationService';
import { settleBackgroundTasks } from '../utils/background';
import { createUser, bearer } from './helpers';

const as = (user: IUserDocument) => ({
  get: (url: string) => request(app).get(`/api/v1${url}`).set('Authorization', bearer(user)),
  post: (url: string, body: object = {}) => request(app).post(`/api/v1${url}`).set('Authorization', bearer(user)).send(body),
  put: (url: string, body: object = {}) => request(app).put(`/api/v1${url}`).set('Authorization', bearer(user)).send(body)
});

const sent = { ok: true, messageId: 'wamid.1', attempts: 1 };

function spyOnChannels(whatsapp: object = sent, email = true) {
  return {
    email: jest.spyOn(EmailService, 'send').mockResolvedValue(email),
    whatsapp: jest.spyOn(WhatsAppService, 'sendTemplate').mockResolvedValue(whatsapp as never)
  };
}

const parentWithWhatsApp = (prefs?: object, phone = '+258841234567') =>
  createUser('responsavel', { firstName: 'Marta', phone, whatsappOptIn: true }).then(async (user) => {
    if (prefs) {
      user.notificationPrefs = prefs;
      await user.save();
    }
    return user;
  });

const invoiceParams = (parent: IUserDocument) => ({ parent, childName: 'Tito', invoiceNumber: 'F-1', amount: 4500, dueDate: '10/11/2026' });

describe('choosing channels: consent, then the family’s preferences', () => {
  it('check-in goes by WhatsApp only by default, and not at all when the family turns it off', async () => {
    const channels = spyOnChannels();
    const parent = await parentWithWhatsApp();
    expect(await NotificationService.attendanceCheckIn({ parent, childName: 'Tito', checkInTime: '07:30', date: '03/11/2026' })).toEqual({ email: false, whatsapp: true });
    expect(channels.whatsapp).toHaveBeenCalledWith('+258841234567', expect.objectContaining({ template: 'sonho_attendance_checkin', language: 'pt_PT', body: ['Marta', 'Tito', '07:30', '03/11/2026'] }));
    expect(channels.email).not.toHaveBeenCalled();

    const quiet = await parentWithWhatsApp({ attendance: { whatsapp: false, email: false } }, '+258847654321');
    expect(await NotificationService.attendanceCheckIn({ parent: quiet, childName: 'Tito', checkInTime: '07:30', date: '03/11/2026' })).toEqual({ email: false, whatsapp: false });
    expect(channels.whatsapp).toHaveBeenCalledTimes(1);
  });

  it('no WhatsApp without consent, whatever the preferences say', async () => {
    const channels = spyOnChannels();
    const parent = await createUser('responsavel', { phone: '+258841234567', whatsappOptIn: false });
    expect(await NotificationService.newInvoice(invoiceParams(parent))).toEqual({ email: true, whatsapp: false });
    expect(channels.whatsapp).not.toHaveBeenCalled();
  });

  it('records each send, with a link to the right page and the approved wording', async () => {
    const channels = spyOnChannels();
    const parent = await parentWithWhatsApp();
    await NotificationService.newInvoice(invoiceParams(parent));
    expect(channels.email).toHaveBeenCalledWith('invoice', parent.email, 'Nova factura — Tito', expect.objectContaining({ invoicesLink: 'http://localhost:3000/responsavel/facturacao' }));
    const rows = await NotificationLog.find().sort({ channel: 1 });
    expect(rows.map((row) => [row.channel, row.category, row.status])).toEqual([['email', 'billing', 'sent'], ['whatsapp', 'billing', 'sent']]);
    expect(rows[1].provider_id).toBe('wamid.1');
    expect(String(rows[1].user_id)).toBe(String(parent._id));
  });

  it('account messages keep no payload: their links are credentials', async () => {
    spyOnChannels();
    const parent = await parentWithWhatsApp();
    await NotificationService.passwordReset({ user: parent, resetToken: 'secret-token' });
    const rows = await NotificationLog.find();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.payload === null)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain('secret-token');
  });
});

describe('email fallback when WhatsApp fails', () => {
  it('sends the email instead when the family only wanted WhatsApp', async () => {
    const channels = spyOnChannels({ ok: false, error: 'Meta 400: número inválido', attempts: 1 });
    const parent = await parentWithWhatsApp({ billing: { whatsapp: true, email: false } });
    expect(await NotificationService.newInvoice(invoiceParams(parent))).toEqual({ email: true, whatsapp: false });
    expect(channels.email).toHaveBeenCalledTimes(1);
  });

  it('never turns check-ins into emails', async () => {
    const channels = spyOnChannels({ ok: false, error: 'falhou', attempts: 3 });
    const parent = await parentWithWhatsApp();
    await NotificationService.attendanceCheckOut({ parent, childName: 'Tito', checkOutTime: '16:00', date: '03/11/2026' });
    expect(channels.email).not.toHaveBeenCalled();
  });
});

describe('WhatsAppService.sendTemplate', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    process.env.WHATSAPP_TOKEN = 'token';
    process.env.WHATSAPP_PHONE_ID = '123';
  });
  afterEach(() => {
    process.env.WHATSAPP_TOKEN = '';
    process.env.WHATSAPP_PHONE_ID = '';
    global.fetch = realFetch;
  });
  const reply = (status: number, body: object) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  it('retries temporary failures, up to 3 attempts, and sends links as a URL button', async () => {
    const fetchMock = jest.fn()
      .mockImplementationOnce(() => reply(503, { error: { message: 'indisponível' } }))
      .mockImplementationOnce(() => Promise.reject(new Error('ECONNRESET')))
      .mockImplementationOnce(() => reply(200, { messages: [{ id: 'wamid.ok' }] }));
    global.fetch = fetchMock as typeof fetch;
    const result = await WhatsAppService.sendTemplate('84 123 4567', { template: 'sonho_invite', language: 'pt_PT', body: ['Marta', 'Educador'], buttonSuffix: 'abc' });
    expect(result).toEqual({ ok: true, messageId: 'wamid.ok', attempts: 3 });
    expect(fetchMock.mock.calls[0][0]).toBe('https://graph.facebook.com/v23.0/123/messages');
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.to).toBe('258841234567');
    expect(payload.template.components).toEqual([
      { type: 'body', parameters: [{ type: 'text', text: 'Marta' }, { type: 'text', text: 'Educador' }] },
      { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'abc' }] }
    ]);
  });

  it('does not retry errors that will not go away', async () => {
    const fetchMock = jest.fn(() => reply(400, { error: { code: 131026, message: 'Message undeliverable' } }));
    global.fetch = fetchMock as typeof fetch;
    const result = await WhatsAppService.sendTemplate('+258841234567', { template: 't', language: 'pt_PT', body: [] });
    expect(result).toEqual({ ok: false, error: 'Meta 400 (131026): Message undeliverable', attempts: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('delivery webhook', () => {
  beforeEach(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'verify-me';
    process.env.WHATSAPP_APP_SECRET = 'app-secret';
  });
  const statusBody = (id: string, status: string, errors?: object[]) => JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id, status, ...(errors && { errors }) }] } }] }] });
  const post = (body: string, secret = 'app-secret') =>
    request(app)
      .post('/api/v1/webhooks/whatsapp')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`)
      .send(body);

  it('answers Meta’s verification only with the right token, and is off without configuration', async () => {
    const ok = await request(app).get('/api/v1/webhooks/whatsapp').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '42' });
    expect(ok.status).toBe(200);
    expect(ok.text).toBe('42');
    expect((await request(app).get('/api/v1/webhooks/whatsapp').query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '42' })).status).toBe(403);
    process.env.WHATSAPP_APP_SECRET = '';
    expect((await post(statusBody('x', 'read'))).status).toBe(503);
  });

  it('rejects unsigned or wrongly signed posts', async () => {
    expect((await post(statusBody('x', 'read'), 'other-secret')).status).toBe(401);
    expect((await request(app).post('/api/v1/webhooks/whatsapp').send({ entry: [] })).status).toBe(401);
  });

  it('moves statuses forward only, and falls back to email once when delivery fails', async () => {
    const channels = spyOnChannels();
    const parent = await parentWithWhatsApp({ billing: { whatsapp: true, email: false } });
    await NotificationService.newInvoice(invoiceParams(parent));
    expect(channels.email).not.toHaveBeenCalled();

    expect((await post(statusBody('wamid.1', 'read'))).status).toBe(200);
    expect((await post(statusBody('wamid.1', 'delivered'))).status).toBe(200);
    expect((await NotificationLog.findOne({ provider_id: 'wamid.1' }))!.status).toBe('read');

    await post(statusBody('wamid.1', 'failed', [{ code: 131047, title: 'Re-engagement message' }]));
    await post(statusBody('wamid.1', 'failed'));
    const row = await NotificationLog.findOne({ provider_id: 'wamid.1' });
    expect(row!.status).toBe('failed');
    expect(row!.error).toBe('Meta 131047: Re-engagement message');
    expect(channels.email).toHaveBeenCalledTimes(1);
    expect(channels.email).toHaveBeenCalledWith('invoice', parent.email, 'Nova factura — Tito', expect.any(Object));
    expect(await NotificationLog.countDocuments({ fallback_of: row!._id })).toBe(1);
  });
});

describe('Notificações (administration)', () => {
  it('lists the log with filters, for the administration only', async () => {
    spyOnChannels({ ok: false, error: 'falhou', attempts: 3 });
    const admin = await createUser('administrador');
    const parent = await parentWithWhatsApp();
    await NotificationService.newInvoice(invoiceParams(parent));

    expect((await as(parent).get('/notifications')).status).toBe(403);
    const all = await as(admin).get('/notifications');
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(2);
    expect(all.body.data[0].payload).toBeUndefined();
    expect(all.body.meta.failed_this_week).toBe(1);

    const failed = await as(admin).get('/notifications?status=failed');
    expect(failed.body.data.map((row: { channel: string }) => row.channel)).toEqual(['whatsapp']);
    expect(failed.body.data[0].user_id.firstName).toBe('Marta');
    expect((await as(admin).get('/notifications?search=Marta')).body.data).toHaveLength(2);
    expect((await as(admin).get('/notifications?search=ninguem')).body.data).toHaveLength(0);
  });

  it('resends a failed message once, re-checking WhatsApp consent', async () => {
    const channels = spyOnChannels({ ok: false, error: 'falhou', attempts: 3 });
    const admin = await createUser('administrador');
    const parent = await parentWithWhatsApp({ billing: { whatsapp: true, email: true } });
    await NotificationService.newInvoice(invoiceParams(parent));
    const failed = await NotificationLog.findOne({ channel: 'whatsapp' });

    channels.whatsapp.mockResolvedValue({ ok: true, messageId: 'wamid.2', attempts: 1 });
    const resend = await as(admin).post(`/notifications/${failed!._id}/resend`);
    expect(resend.status).toBe(200);
    expect(channels.whatsapp).toHaveBeenLastCalledWith('+258841234567', expect.objectContaining({ template: 'sonho_invoice_new', body: ['Marta', 'F-1', 'Tito', expect.stringMatching(/^4\s500,00 MT$/), '10/11/2026'] }));
    expect(await NotificationLog.countDocuments({ resend_of: failed!._id, status: 'sent' })).toBe(1);
    const list = await as(admin).get('/notifications?channel=whatsapp');
    expect(list.body.data.find((row: { _id: string }) => row._id === String(failed!._id))).toMatchObject({ resendable: false, handled: true });

    parent.whatsappOptIn = false;
    await parent.save();
    const again = await as(admin).post(`/notifications/${failed!._id}/resend`);
    expect(again.status).toBe(422);
    expect(again.body.message).toBe('A pessoa já não aceita WhatsApp');
  });

  it('account messages are re-issued from Pessoas, not resent', async () => {
    spyOnChannels({ ok: false, error: 'falhou', attempts: 1 }, false);
    const admin = await createUser('administrador');
    const parent = await parentWithWhatsApp();
    await NotificationService.passwordReset({ user: parent, resetToken: 't' });
    const row = await NotificationLog.findOne({ channel: 'whatsapp' });
    const list = await as(admin).get('/notifications');
    expect(list.body.data.every((item: { resendable: boolean }) => !item.resendable)).toBe(true);
    const resend = await as(admin).post(`/notifications/${row!._id}/resend`);
    expect(resend.status).toBe(422);
    expect(resend.body.message).toMatch(/Pessoas/);
  });
});

describe('preferences in the profile', () => {
  it('returns the defaults and saves one category at a time', async () => {
    const parent = await parentWithWhatsApp();
    const me = await as(parent).get('/auth/me');
    expect(me.body.data.user.notificationPrefs).toEqual({
      attendance: { whatsapp: true, email: false },
      reports: { whatsapp: true, email: true },
      billing: { whatsapp: true, email: true },
      messages: { whatsapp: true, email: true }
    });
    const update = await as(parent).put('/auth/me', { notificationPrefs: { attendance: { whatsapp: false } } });
    expect(update.status).toBe(200);
    await as(parent).put('/auth/me', { notificationPrefs: { reports: { email: false } } });
    const after = await as(parent).get('/auth/me');
    expect(after.body.data.user.notificationPrefs.attendance).toEqual({ whatsapp: false, email: false });
    expect(after.body.data.user.notificationPrefs.reports).toEqual({ whatsapp: true, email: false });
    expect((await as(parent).put('/auth/me', { notificationPrefs: { attendance: { whatsapp: 'talvez' } } })).status).toBe(400);
  });
});

describe('payments', () => {
  it('tells the family when a payment settles the invoice, once', async () => {
    const notify = jest.spyOn(NotificationService, 'invoicePaid').mockResolvedValue({ email: true, whatsapp: true });
    const admin = await createUser('administrador');
    const parent = await parentWithWhatsApp();
    const klass = await Class.create({ name: 'Turma X', min_age_months: 12, max_age_months: 36, capacity: 10 });
    const child = await Child.create({ name: 'Tito', birth_date: new Date('2024-01-01'), class_id: klass._id, parent_id: parent._id });
    const invoice = await Invoice.create({ invoice_number: 'F-1', child_id: child._id, parent_id: parent._id, issue_date: new Date(), due_date: new Date(), amount: 100, status: 'pending', created_by: admin._id });
    const pay = (amount: number) => as(admin).post('/payments', { invoice_id: String(invoice._id), parent_id: String(parent._id), child_id: String(child._id), amount, payment_method: 'cash' });

    expect((await pay(60)).status).toBe(201);
    await settleBackgroundTasks();
    expect(notify).not.toHaveBeenCalled();
    await pay(40);
    await pay(10);
    await settleBackgroundTasks();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ childName: 'Tito', invoiceNumber: 'F-1', amount: 100, parent: expect.objectContaining({ whatsappOptIn: true }) }));
  });
});
