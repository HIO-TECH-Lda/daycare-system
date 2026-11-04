/**
 * The web app for the end-to-end tests: a production build (so the service worker and offline
 * behaviour are the real ones) in its own folder (.next-e2e, never clashing with `next dev`),
 * pointed at the throwaway API, served on E2E_WEB_PORT (default 3101).
 *
 * E2E_SKIP_BUILD=1 reuses the last build (CI builds in its own step).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web-app');
const port = process.env.E2E_WEB_PORT || '3101';
const env = {
  ...process.env,
  NEXT_PUBLIC_API_URL: process.env.E2E_API_URL || 'http://localhost:3102',
  NEXT_DIST_DIR: '.next-e2e',
  NEXT_TELEMETRY_DISABLED: '1'
};
const next = path.join(webDir, 'node_modules', 'next', 'dist', 'bin', 'next');

function run(args) {
  const child = spawn(process.execPath, [next, ...args], { cwd: webDir, env, stdio: 'inherit' });
  return child;
}

if (!process.env.E2E_SKIP_BUILD) {
  const code = await new Promise((resolve) => run(['build']).on('exit', resolve));
  if (code !== 0) process.exit(code ?? 1);
}
const server = run(['start', '-p', port]);
const stop = () => server.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => process.exit(code ?? 0));
