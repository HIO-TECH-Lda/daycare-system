import request from 'supertest';
import { app } from '../app';
import User from '../models/User';
import { createUser, bearer, tokenFromInviteLink, TEST_PASSWORD } from './helpers';

const newStaff = { firstName: 'Joana', lastName: 'Cossa', email: 'joana@example.com', role: 'staff', phone: '84 123 4567' };

async function inviteAs(admin: Awaited<ReturnType<typeof createUser>>, body: object = newStaff) {
  return request(app).post('/api/v1/users').set('Authorization', bearer(admin)).send(body);
}

describe('POST /api/v1/users (admin creates + invites)', () => {
  it('creates an invited user without a password and returns an invite link', async () => {
    const admin = await createUser('administrador');

    const res = await inviteAs(admin);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'joana@example.com', role: 'staff', status: 'invited' });
    expect(res.body.data.inviteLink).toMatch(/^http:\/\/localhost:3000\/convite\/[0-9a-f]{64}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/inviteTokenHash|password/);

    const stored = await User.findOne({ email: 'joana@example.com' }).select('+password +inviteTokenHash');
    expect(stored!.password).toBeUndefined();
    expect(stored!.inviteTokenHash).toBeDefined();
    expect(stored!.invitedBy!.toString()).toBe((admin._id as any).toString());
  });

  it.each(['staff', 'responsavel'] as const)('is forbidden for %s', async (role) => {
    const user = await createUser(role);
    expect((await inviteAs(user)).status).toBe(403);
  });

  it('rejects a duplicate email', async () => {
    const admin = await createUser('administrador');
    await createUser('responsavel', { email: 'joana@example.com' });

    expect((await inviteAs(admin)).status).toBe(409);
  });

  it('validates the body', async () => {
    const admin = await createUser('administrador');
    const res = await inviteAs(admin, { firstName: 'J', email: 'not-an-email', role: 'superuser' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('invite acceptance', () => {
  async function invite() {
    const admin = await createUser('administrador');
    const res = await inviteAs(admin);
    return { admin, token: tokenFromInviteLink(res.body.data.inviteLink) };
  }

  it('shows who the invite is for', async () => {
    const { token } = await invite();
    const res = await request(app).get(`/api/v1/auth/invite/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ firstName: 'Joana', email: 'joana@example.com', role: 'staff' });
  });

  it('activates the account, records WhatsApp consent, logs the user in, and works only once', async () => {
    const { token } = await invite();

    const res = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD, whatsappOptIn: true });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();

    const user = await User.findOne({ email: 'joana@example.com' });
    expect(user!.status).toBe('active');
    expect(user!.whatsappOptIn).toBe(true);
    expect(user!.whatsappOptInAt).toBeInstanceOf(Date);
    expect(user!.activatedAt).toBeInstanceOf(Date);

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'joana@example.com', password: TEST_PASSWORD });
    expect(login.status).toBe(200);

    const again = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, password: 'Other@1234', confirmPassword: 'Other@1234' });
    expect(again.status).toBe(400);
  });

  it('rejects an expired invite', async () => {
    const { token } = await invite();
    await User.updateOne({ email: 'joana@example.com' }, { inviteExpires: new Date(Date.now() - 1000) });

    expect((await request(app).get(`/api/v1/auth/invite/${token}`)).status).toBe(400);
  });

  it('rejects a weak password', async () => {
    const { token } = await invite();
    const res = await request(app)
      .post('/api/v1/auth/accept-invite')
      .send({ token, password: 'fraca', confirmPassword: 'fraca' });
    expect(res.status).toBe(400);
  });

  it('an invited user cannot log in before accepting', async () => {
    await invite();
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'joana@example.com', password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('resending replaces the old link', async () => {
    const { admin, token: oldToken } = await invite();
    const invited = await User.findOne({ email: 'joana@example.com' });

    const res = await request(app)
      .post(`/api/v1/users/${invited!._id}/resend-invite`)
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(200);
    const newToken = tokenFromInviteLink(res.body.data.inviteLink);
    expect(newToken).not.toBe(oldToken);
    expect((await request(app).get(`/api/v1/auth/invite/${oldToken}`)).status).toBe(400);
    expect((await request(app).get(`/api/v1/auth/invite/${newToken}`)).status).toBe(200);
  });

  it('cannot resend to an already active user', async () => {
    const admin = await createUser('administrador');
    const active = await createUser('staff');
    const res = await request(app).post(`/api/v1/users/${active._id}/resend-invite`).set('Authorization', bearer(admin));
    expect(res.status).toBe(409);
  });
});

describe('user management', () => {
  it('admin can deactivate a user, who is then locked out', async () => {
    const admin = await createUser('administrador');
    const staff = await createUser('staff');

    const res = await request(app)
      .patch(`/api/v1/users/${staff._id}/status`)
      .set('Authorization', bearer(admin))
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');
    expect((await request(app).get('/api/v1/auth/me').set('Authorization', bearer(staff))).status).toBe(401);
  });

  it('admin cannot change their own status or role', async () => {
    const admin = await createUser('administrador');
    const auth = bearer(admin);

    expect((await request(app).patch(`/api/v1/users/${admin._id}/status`).set('Authorization', auth).send({ status: 'inactive' })).status).toBe(400);
    expect((await request(app).put(`/api/v1/users/${admin._id}`).set('Authorization', auth).send({ role: 'staff' })).status).toBe(400);
  });

  it('an invited user cannot be activated by an admin', async () => {
    const admin = await createUser('administrador');
    const invited = await createUser('staff', { status: 'invited' });
    const res = await request(app)
      .patch(`/api/v1/users/${invited._id}/status`)
      .set('Authorization', bearer(admin))
      .send({ status: 'active' });
    expect(res.status).toBe(409);
  });

  it('admin can update details; email must stay unique', async () => {
    const admin = await createUser('administrador');
    const staff = await createUser('staff');
    await createUser('responsavel', { email: 'taken@example.com' });
    const auth = bearer(admin);

    const ok = await request(app).put(`/api/v1/users/${staff._id}`).set('Authorization', auth).send({ phone: '841234567' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.phone).toBe('841234567');

    const clash = await request(app).put(`/api/v1/users/${staff._id}`).set('Authorization', auth).send({ email: 'taken@example.com' });
    expect(clash.status).toBe(409);
  });

  it('returns 404 for an unknown user and 400 for a malformed id', async () => {
    const admin = await createUser('administrador');
    const auth = bearer(admin);
    expect((await request(app).get('/api/v1/users/64b000000000000000000000').set('Authorization', auth)).status).toBe(404);
    expect((await request(app).get('/api/v1/users/not-an-id').set('Authorization', auth)).status).toBe(400);
  });

  it('only admins can list non-active users', async () => {
    const admin = await createUser('administrador');
    const staff = await createUser('staff');
    await createUser('responsavel', { status: 'invited' });

    const asAdmin = await request(app).get('/api/v1/users?status=invited').set('Authorization', bearer(admin));
    expect(asAdmin.body.data).toHaveLength(1);

    const asStaff = await request(app).get('/api/v1/users?status=invited').set('Authorization', bearer(staff));
    expect(asStaff.body.data.every((u: { status: string }) => u.status === 'active')).toBe(true);
  });
});
