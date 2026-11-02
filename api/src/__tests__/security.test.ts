import request from 'supertest';
import { app } from '../app';
import { isOriginAllowed } from '../config/cors';
import { WhatsAppService } from '../services/whatsAppService';

describe('CORS', () => {
  const original = { origins: process.env.CORS_ORIGINS, env: process.env.NODE_ENV };
  afterEach(() => {
    process.env.CORS_ORIGINS = original.origins;
    process.env.NODE_ENV = original.env;
  });

  it('allows listed origins, including wildcard deploy previews', () => {
    process.env.CORS_ORIGINS = 'https://app.example.co.mz, https://deploy-preview-*--sonho.netlify.app';
    expect(isOriginAllowed('https://app.example.co.mz')).toBe(true);
    expect(isOriginAllowed('https://deploy-preview-12--sonho.netlify.app')).toBe(true);
    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
    expect(isOriginAllowed('https://app.example.co.mz.evil.com')).toBe(false);
    expect(isOriginAllowed('https://deploy-preview-1--sonho.netlify.app.evil.com')).toBe(false);
  });

  it('allows any origin in development but none in production when unset', () => {
    process.env.CORS_ORIGINS = '';
    process.env.NODE_ENV = 'development';
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    process.env.NODE_ENV = 'production';
    expect(isOriginAllowed('http://localhost:3000')).toBe(false);
  });

  it('sends the CORS header only to allowed origins', async () => {
    process.env.CORS_ORIGINS = 'https://app.example.co.mz';

    const allowed = await request(app).get('/health').set('Origin', 'https://app.example.co.mz');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.co.mz');

    const blocked = await request(app).get('/health').set('Origin', 'https://evil.example.com');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('WhatsAppService.normalisePhone', () => {
  it.each([
    ['84 123 4567', '258841234567'],
    ['+258 84 123 4567', '258841234567'],
    ['00258841234567', '258841234567'],
    ['(258) 87-123-4567', '258871234567']
  ])('%s → %s', (input, expected) => {
    expect(WhatsAppService.normalisePhone(input)).toBe(expected);
  });
});
