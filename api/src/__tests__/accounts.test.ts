import request from 'supertest';
import { app } from '../app';
import User from '../models/User';
import { EmailService } from '../services/emailService';
import { WhatsAppService } from '../services/whatsAppService';
import { normalisePhone } from '../utils/phone';
import { settleBackgroundTasks } from '../utils/background';
import { createUser, bearer, tokenFromInviteLink, tokenFromResetLink, TEST_PASSWORD } from './helpers';

const NEW_PASSWORD = 'Nova@12345';

function spyOnChannels() {
  return {
    email: jest.spyOn(EmailService, 'send').mockResolvedValue(true),
    whatsapp: jest.spyOn(WhatsAppService, 'sendTemplate').mockResolvedValue(true)
  };
}

/** The link passed as the 2nd body parameter of a WhatsApp template call. */
function linkFromWhatsApp(call: unknown[]): string {
  const components = call[3] as Array<{ parameters: Array<{ text: string }> }>;
  return components[0].parameters[1].text;
}

describe('normalisePhone', () => {
  it.each([
    ['84 123 4567', '+258841234567'],
    ['+258 84 123 4567', '+258841234567'],
    ['00258841234567', '+258841234567'],
    ['258841234567', '+258841234567'],
    ['21 123 456', '+25821123456'],
    ['+27 82 123 4567', '+27821234567']
  ])('%s → %s', (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });

  it.each(['', 'abc', '841234', '+258 84 123 456', '0841234567'])('rejects %p', (input) => {
    expect(normalisePhone(input)).toBeNull();
  });
});

describe('phone or email accounts', () => {
  it('creates a phone-only user who can then log in with the phone written any way', async () => {
    const admin = await createUser('administrador');
    const res = await request(app).post('/api/v1/users').set('Authorization', bearer(admin))
      .send({ firstName: 'Maria', lastName: 'Langa', phone: '84 123 4567', role: 'responsavel' });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: '', phone: '+258841234567', status: 'invited' });
    // No email and no WhatsApp consent: nothing could be sent, the admin shares the link by hand
    expect(res.body.data.delivery).toEqual({ email: false, whatsapp: false });

    const token = tokenFromInviteLink(res.body.data.inviteLink);
    const accept = await request(app).post('/api/v1/auth/accept-invite')
      .send({ token, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD });
    expect(accept.status).toBe(200);

    for (const identifier of ['841234567', '+258 84 123 4567', '00258 84 123 4567']) {
      const login = await request(app).post('/api/v1/auth/login').send({ identifier, password: TEST_PASSWORD });
      expect(login.status).toBe(200);
    }
    // Older clients send the identifier in `email`
    const legacy = await request(app).post('/api/v1/auth/login').send({ email: '84 123 4567', password: TEST_PASSWORD });
    expect(legacy.status).toBe(200);
  });

  it('requires an email or a phone number', async () => {
    const admin = await createUser('administrador');
    const res = await request(app).post('/api/v1/users').set('Authorization', bearer(admin))
      .send({ firstName: 'Sem', lastName: 'Contacto', role: 'responsavel' });
    expect(res.status).toBe(400);
  });

  it('rejects a phone number that is already registered, whatever its format', async () => {
    const admin = await createUser('administrador');
    await createUser('responsavel', { phone: '841234567' });
    const res = await request(app).post('/api/v1/users').set('Authorization', bearer(admin))
      .send({ firstName: 'Outra', lastName: 'Pessoa', phone: '+258 84 123 4567', role: 'responsavel' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/telefone/);
  });

  it('rejects an invalid phone number', async () => {
    const admin = await createUser('administrador');
    const res = await request(app).post('/api/v1/users').set('Authorization', bearer(admin))
      .send({ firstName: 'Maria', lastName: 'Langa', phone: '12345', role: 'responsavel' });
    expect(res.status).toBe(400);
  });

  it('does not let a user remove their only contact', async () => {
    const parent = await createUser('responsavel', { email: null, phone: '841234567' });
    const res = await request(app).put('/api/v1/auth/me').set('Authorization', bearer(parent)).send({ phone: '' });
    expect(res.status).toBe(400);
  });

  it('lets a user record or withdraw WhatsApp consent on their profile', async () => {
    const parent = await createUser('responsavel', { phone: '841234567' });
    const auth = bearer(parent);

    const optIn = await request(app).put('/api/v1/auth/me').set('Authorization', auth).send({ whatsappOptIn: true });
    expect(optIn.status).toBe(200);
    expect(optIn.body.data.user.whatsappOptIn).toBe(true);
    expect((await User.findById(parent._id))!.whatsappOptInAt).toBeInstanceOf(Date);

    const optOut = await request(app).put('/api/v1/auth/me').set('Authorization', auth).send({ whatsappOptIn: false });
    expect(optOut.body.data.user.whatsappOptIn).toBe(false);
  });
});

describe('invite delivery', () => {
  it('uses WhatsApp only when consent was recorded', async () => {
    const channels = spyOnChannels();
    const admin = await createUser('administrador');
    const auth = bearer(admin);

    const withoutConsent = await request(app).post('/api/v1/users').set('Authorization', auth)
      .send({ firstName: 'Ana', lastName: 'Cossa', email: 'ana@example.com', phone: '841111111', role: 'responsavel' });
    expect(withoutConsent.body.data.delivery).toEqual({ email: true, whatsapp: false });
    expect(channels.whatsapp).not.toHaveBeenCalled();

    const withConsent = await request(app).post('/api/v1/users').set('Authorization', auth)
      .send({ firstName: 'Rui', lastName: 'Mondlane', phone: '842222222', role: 'responsavel', whatsappOptIn: true });
    expect(withConsent.body.data.delivery).toEqual({ email: false, whatsapp: true });
    expect(channels.whatsapp).toHaveBeenCalledWith('258842222222', 'sonho_invite', expect.any(String), expect.any(Array));
    expect(linkFromWhatsApp(channels.whatsapp.mock.calls[0])).toBe(withConsent.body.data.inviteLink);
  });
});

describe('forgot password', () => {
  it('sends the reset link by WhatsApp to a phone-only user who consented, and the link works', async () => {
    const channels = spyOnChannels();
    const parent = await createUser('responsavel', { email: null, phone: '841234567', whatsappOptIn: true });
    const oldAuth = bearer(parent);

    const res = await request(app).post('/api/v1/auth/forgot-password').send({ identifier: '84 123 4567' });
    expect(res.status).toBe(200);
    await settleBackgroundTasks();

    expect(channels.whatsapp).toHaveBeenCalledWith('258841234567', 'sonho_password_reset', expect.any(String), expect.any(Array));
    const token = tokenFromResetLink(linkFromWhatsApp(channels.whatsapp.mock.calls[0]));

    const reset = await request(app).post('/api/v1/auth/reset-password').send({ token, newPassword: NEW_PASSWORD });
    expect(reset.status).toBe(200);
    expect((await request(app).post('/api/v1/auth/login').send({ identifier: '841234567', password: NEW_PASSWORD })).status).toBe(200);
    // Resetting the password ends existing sessions
    expect((await request(app).get('/api/v1/auth/me').set('Authorization', oldAuth)).status).toBe(401);
  });

  it('does not use WhatsApp without consent', async () => {
    const channels = spyOnChannels();
    await createUser('responsavel', { email: null, phone: '841234567' });

    await request(app).post('/api/v1/auth/forgot-password').send({ identifier: '841234567' });
    await settleBackgroundTasks();

    expect(channels.whatsapp).not.toHaveBeenCalled();
  });

  it('re-sends the invite to someone who never activated their account', async () => {
    const channels = spyOnChannels();
    const admin = await createUser('administrador');
    const invited = await request(app).post('/api/v1/users').set('Authorization', bearer(admin))
      .send({ firstName: 'Joana', lastName: 'Cossa', email: 'joana@example.com', role: 'staff' });
    const oldToken = tokenFromInviteLink(invited.body.data.inviteLink);
    channels.email.mockClear();

    await request(app).post('/api/v1/auth/forgot-password').send({ identifier: 'joana@example.com' });
    await settleBackgroundTasks();

    expect(channels.email).toHaveBeenCalledWith('invite', 'joana@example.com', expect.any(String), expect.any(Object));
    const newLink = (channels.email.mock.calls[0][3] as { inviteLink: string }).inviteLink;
    expect((await request(app).get(`/api/v1/auth/invite/${oldToken}`)).status).toBe(400);
    expect((await request(app).get(`/api/v1/auth/invite/${tokenFromInviteLink(newLink)}`)).status).toBe(200);
  });

  it('answers immediately with the same message whether or not the account exists', async () => {
    const known = await createUser('responsavel', { email: 'ana@example.com' });
    const a = await request(app).post('/api/v1/auth/forgot-password').send({ identifier: known.email });
    const b = await request(app).post('/api/v1/auth/forgot-password').send({ identifier: 'ninguem@example.com' });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body).toEqual(b.body);
  });
});

describe('admin password-reset link', () => {
  it('gives the admin a working link for an active user', async () => {
    const admin = await createUser('administrador');
    const parent = await createUser('responsavel', { email: null, phone: '841234567' });

    const res = await request(app).post(`/api/v1/users/${parent._id}/password-reset-link`).set('Authorization', bearer(admin));
    expect(res.status).toBe(200);

    const reset = await request(app).post('/api/v1/auth/reset-password')
      .send({ token: tokenFromResetLink(res.body.data.resetLink), newPassword: NEW_PASSWORD });
    expect(reset.status).toBe(200);
  });

  it('refuses for someone who never activated (they need an invite)', async () => {
    const admin = await createUser('administrador');
    const invited = await request(app).post('/api/v1/users').set('Authorization', bearer(admin))
      .send({ firstName: 'Joana', lastName: 'Cossa', email: 'joana@example.com', role: 'staff' });
    const res = await request(app).post(`/api/v1/users/${invited.body.data.user.id}/password-reset-link`).set('Authorization', bearer(admin));
    expect(res.status).toBe(409);
  });

  it('is admin-only', async () => {
    const staff = await createUser('staff');
    const parent = await createUser('responsavel');
    const res = await request(app).post(`/api/v1/users/${parent._id}/password-reset-link`).set('Authorization', bearer(staff));
    expect(res.status).toBe(403);
  });
});
