import request from 'supertest';
import { app } from '../app';

describe('GET /health', () => {
  it('returns 200 and status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.message).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});
