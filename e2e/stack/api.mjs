/**
 * A throwaway API for the end-to-end tests: an in-memory MongoDB, the demo seed, and the API
 * on E2E_API_PORT (default 3102). Email and WhatsApp are switched off, so nothing leaves the
 * machine; invites are read from the screen (the "share the link" fallback).
 *
 * Started by Playwright (playwright.config.ts → webServer) and stopped with it.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const apiDir = path.join(root, 'api');
const require = createRequire(path.join(apiDir, 'package.json'));
const { MongoMemoryServer } = require('mongodb-memory-server');

const port = process.env.E2E_API_PORT || '3102';
const webOrigin = process.env.E2E_WEB_ORIGIN || 'http://localhost:3101';

const mongo = await MongoMemoryServer.create();
const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: port,
  MONGODB_URI: `${mongo.getUri()}daycare-e2e`,
  JWT_SECRET: 'e2e-jwt-secret',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret',
  FRONTEND_URL: webOrigin,
  CORS_ORIGINS: webOrigin,
  API_PUBLIC_URL: `http://localhost:${port}`,
  // Set but empty: a local api/.env can't switch real sending on (dotenv keeps existing values)
  SMTP_USER: '',
  SMTP_PASS: '',
  WHATSAPP_TOKEN: '',
  WHATSAPP_PHONE_ID: '',
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: ''
};

const children = [];
function run(args, { wait }) {
  const child = spawn(process.execPath, [require.resolve('ts-node/dist/bin.js'), '-r', 'tsconfig-paths/register', ...args], { cwd: apiDir, env, stdio: 'inherit' });
  children.push(child);
  if (!wait) return child;
  return new Promise((resolve, reject) => child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${args.join(' ')} exited with ${code}`)))));
}

async function stop() {
  for (const child of children) child.kill();
  await mongo.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await run(['scripts/seed.ts', '--fresh'], { wait: true });
const api = run(['src/app.ts'], { wait: false });
api.on('exit', (code) => {
  console.error(`[e2e] API exited with ${code}`);
  void stop();
});
