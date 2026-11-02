import request from 'supertest';
import { app } from '../app';
import User from '../models/User';

const password = 'Test@1234';

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await User.create({
      firstName: 'Ana',
      lastName: 'Machava',
      email: 'ana@example.com',
      password,
      role: 'staff'
    });
  });

  it('returns tokens for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.role).toBe('staff');
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password: 'Wrong@1234' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
