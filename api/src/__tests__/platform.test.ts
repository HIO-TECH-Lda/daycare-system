import request from 'supertest';
import { app } from '../app';
import * as database from '../config/database';
import handler from '../../api/index';
import { createUser, bearer } from './helpers';

describe('uploads', () => {
  it('a file over the limit gets 413, not a crash', async () => {
    const admin = await createUser('administrador');
    const res = await request(app).post('/api/v1/children').set('Authorization', bearer(admin))
      .attach('photo', Buffer.alloc(4.5 * 1024 * 1024), { filename: 'grande.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/4 MB/);
  });

  it('a file of the wrong type gets 400', async () => {
    const admin = await createUser('administrador');
    const res = await request(app).post('/api/v1/children').set('Authorization', bearer(admin))
      .attach('photo', Buffer.from('not an image'), { filename: 'nota.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });
});

describe('Vercel entry point (api/index.ts)', () => {
  it('serves requests through the Express app', async () => {
    const res = await request(handler).get('/health');
    expect(res.status).toBe(200);
  });

  it('answers 503 when the database is unreachable, without exiting', async () => {
    jest.spyOn(database, 'connectDB').mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await request(handler).get('/api/v1/children');
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED/);
  });
});
