import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../app';
import AuditLog from '../models/AuditLog';
import { MongoRateLimitStore } from '../middleware/rateLimitStore';
import { settleBackgroundTasks } from '../utils/background';
import { createUser, bearer, TEST_PASSWORD } from './helpers';

describe('audit log', () => {
  it('records each change once, with the acting user', async () => {
    const admin = await createUser('administrador');
    const res = await request(app).post('/api/v1/users').set('Authorization', bearer(admin))
      .send({ firstName: 'Joana', lastName: 'Cossa', email: 'joana@example.com', role: 'staff' });
    expect(res.status).toBe(201);
    await settleBackgroundTasks();

    const entries = await AuditLog.find({ entityType: 'users' }).lean();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ action: 'create', entityId: res.body.data.user.id, entityName: 'Joana Cossa' });
    expect(entries[0].userId!.toString()).toBe((admin._id as any).toString());
  });

  it('records a password change without storing any password', async () => {
    const user = await createUser('responsavel');
    const res = await request(app).put('/api/v1/auth/change-password').set('Authorization', bearer(user))
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'Nova@12345', confirmNewPassword: 'Nova@12345' });
    expect(res.status).toBe(200);
    await settleBackgroundTasks();

    const entries = await AuditLog.find({}).lean();
    expect(entries).toHaveLength(1);
    const stored = JSON.stringify(entries);
    expect(stored).not.toMatch(/Nova@12345|Test@1234/);
    expect(stored).toMatch(/\[redacted\]/);
  });

  it('skips login and token endpoints', async () => {
    const user = await createUser('staff');
    await request(app).post('/api/v1/auth/login').send({ identifier: user.email, password: TEST_PASSWORD });
    await settleBackgroundTasks();
    expect(await AuditLog.countDocuments()).toBe(0);
  });
});

describe('MongoRateLimitStore', () => {
  const collection = 'ratelimits_test';
  afterEach(async () => {
    await mongoose.connection.collection(collection).deleteMany({});
  });

  it('counts hits within a window, then starts a new window', async () => {
    const store = new MongoRateLimitStore('test', collection);
    store.init({ windowMs: 400 } as any);

    expect((await store.increment('1.2.3.4')).totalHits).toBe(1);
    expect((await store.increment('1.2.3.4')).totalHits).toBe(2);
    const third = await store.increment('1.2.3.4');
    expect(third.totalHits).toBe(3);
    expect(third.resetTime).toBeInstanceOf(Date);
    // Keys are independent
    expect((await store.increment('5.6.7.8')).totalHits).toBe(1);

    await store.decrement('1.2.3.4');
    expect((await store.increment('1.2.3.4')).totalHits).toBe(3);

    await new Promise((resolve) => setTimeout(resolve, 450));
    expect((await store.increment('1.2.3.4')).totalHits).toBe(1);

    await store.resetKey('1.2.3.4');
    expect((await store.increment('1.2.3.4')).totalHits).toBe(1);
  });

  it('shares counters between store instances (as between serverless instances)', async () => {
    const a = new MongoRateLimitStore('shared', collection);
    const b = new MongoRateLimitStore('shared', collection);
    a.init({ windowMs: 60_000 } as any);
    b.init({ windowMs: 60_000 } as any);

    await a.increment('key');
    await b.increment('key');
    expect((await a.increment('key')).totalHits).toBe(3);
  });
});
