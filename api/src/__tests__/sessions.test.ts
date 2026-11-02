import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import User from '../models/User';
import { validateEnvironmentVariables } from '../utils/envValidation';
import { createUser, bearer, TEST_PASSWORD } from './helpers';

const NEW_PASSWORD = 'Nova@12345';

async function login(email: string, password = TEST_PASSWORD) {
  const res = await request(app).post('/api/v1/auth/login').send({ identifier: email, password });
  return res.body.data as { token: string; refreshToken: string };
}

describe('tokens', () => {
  it('answers 401 "expired" for an expired access token (so the web app refreshes it)', async () => {
    const user = await createUser('staff');
    const expired = jwt.sign(
      { userId: (user._id as any).toString(), role: user.role, tv: 0, typ: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: -10 }
    );
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token expirado');
  });

  it('refreshes into a working new pair', async () => {
    const user = await createUser('staff');
    const { refreshToken } = await login(user.email!);

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect((await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.data.token}`)).status).toBe(200);
  });

  it('does not accept a refresh token as an access token, even if both secrets were the same', async () => {
    const user = await createUser('staff');
    const saved = process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    try {
      const { refreshToken } = await login(user.email!);
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${refreshToken}`);
      expect(res.status).toBe(403);
    } finally {
      process.env.JWT_REFRESH_SECRET = saved;
    }
  });

  it('does not accept an access token on /auth/refresh', async () => {
    const user = await createUser('staff');
    const { token } = await login(user.email!);
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(401);
  });
});

describe('changing the password', () => {
  it('ends other sessions and returns new tokens for this one', async () => {
    const user = await createUser('responsavel');
    const other = await login(user.email!);
    const current = await login(user.email!);

    const res = await request(app).put('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${current.token}`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD, confirmNewPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);

    const oldUse = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${other.token}`);
    expect(oldUse.status).toBe(401);
    expect(oldUse.body.message).toMatch(/sessão terminou/);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: other.refreshToken })).status).toBe(401);

    expect((await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.data.token}`)).status).toBe(200);
  });

  it('rejects a wrong current password', async () => {
    const user = await createUser('responsavel');
    const res = await request(app).put('/api/v1/auth/change-password').set('Authorization', bearer(user))
      .send({ currentPassword: 'Errada@123', newPassword: NEW_PASSWORD, confirmNewPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
  });
});

describe('errors', () => {
  it('a database failure during login is a generic 500, not "wrong password" with internal details', async () => {
    jest.spyOn(User, 'findOne').mockReturnValueOnce({
      select: () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:27017'))
    } as any);

    const res = await request(app).post('/api/v1/auth/login').send({ identifier: 'a@example.com', password: 'x' });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|10\.0\.0\.5/);
  });
});

describe('environment', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env.NODE_ENV = saved.NODE_ENV;
    process.env.JWT_REFRESH_SECRET = saved.JWT_REFRESH_SECRET;
    if (saved.API_PUBLIC_URL === undefined) delete process.env.API_PUBLIC_URL;
    else process.env.API_PUBLIC_URL = saved.API_PUBLIC_URL;
  });

  it('refuses to start in production without JWT_REFRESH_SECRET', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env.NODE_ENV = 'production';
    process.env.API_PUBLIC_URL = 'https://api.example.co.mz';
    delete process.env.JWT_REFRESH_SECRET;
    expect(validateEnvironmentVariables()).toBe(false);

    process.env.JWT_REFRESH_SECRET = 'another-secret';
    expect(validateEnvironmentVariables()).toBe(true);
  });

  it('refuses to start in production without API_PUBLIC_URL (needed for photo links)', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.NODE_ENV = 'production';
    process.env.JWT_REFRESH_SECRET = 'another-secret';
    delete process.env.API_PUBLIC_URL;
    expect(validateEnvironmentVariables()).toBe(false);
  });
});
