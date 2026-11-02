import request from 'supertest';
import { app } from '../app';
import User from '../models/User';
import { createUser, bearer, TEST_PASSWORD } from './helpers';

describe('POST /api/v1/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    await createUser('staff', { email: 'ana@example.com' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.role).toBe('staff');
  });

  it('accepts the email in any letter case', async () => {
    await createUser('staff', { email: 'ana@example.com' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'Ana@Example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
  });

  it('rejects a wrong password', async () => {
    await createUser('staff', { email: 'ana@example.com' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password: 'Wrong@1234' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('tells a deactivated user (with the right password) their account is disabled', async () => {
    await createUser('staff', { email: 'ana@example.com', status: 'inactive' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/desactivada/);
  });
});

describe('public registration', () => {
  it('no longer exists', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Intruso',
      lastName: 'Teste',
      email: 'intruso@example.com',
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
      role: 'administrador'
    });

    expect(res.status).toBe(404);
    expect(await User.countDocuments({ email: 'intruso@example.com' })).toBe(0);
  });
});

describe('authenticateToken', () => {
  it('rejects a valid token once the account is deactivated', async () => {
    const user = await createUser('staff');
    const auth = bearer(user);

    expect((await request(app).get('/api/v1/auth/me').set('Authorization', auth)).status).toBe(200);

    await User.updateOne({ _id: user._id }, { status: 'inactive' });

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', auth);
    expect(res.status).toBe(401);
  });

  it('uses the current role from the database, not the one in the token', async () => {
    const admin = await createUser('administrador');
    const auth = bearer(admin);
    await User.updateOne({ _id: admin._id }, { role: 'staff' });

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', auth)
      .send({ firstName: 'Novo', lastName: 'Utilizador', email: 'novo@example.com', role: 'staff' });

    expect(res.status).toBe(403);
  });
});

describe('password reset', () => {
  it('responds the same way for unknown emails', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'ninguem@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('requires a strong new password', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({ token: 'abc', newPassword: 'fraca' });
    expect(res.status).toBe(400);
  });
});
