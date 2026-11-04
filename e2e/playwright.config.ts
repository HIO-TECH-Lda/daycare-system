import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against a throwaway stack: in-memory MongoDB with the demo seed, the API on
 * :3102 and a production build of the web app on :3101. Nothing is sent by email or WhatsApp.
 *
 *   npm test              build, start, run everything
 *   E2E_SKIP_BUILD=1 npm test   reuse the last build of the web app
 *   E2E_CHANNEL=chrome npm test use the installed Chrome
 */
const WEB = 'http://localhost:3101';
const API = 'http://localhost:3102';

export default defineConfig({
  testDir: './tests',
  // One seeded database shared by all tests: run them in order, one at a time
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB,
    locale: 'pt-PT',
    timezoneId: 'Africa/Maputo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  // E2E_CHANNEL=chrome (or msedge) uses the installed browser instead of Playwright's Chromium
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.E2E_CHANNEL || undefined } }],
  webServer: [
    {
      command: 'node stack/api.mjs',
      url: `${API}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe'
    },
    {
      command: 'node stack/web.mjs',
      url: WEB,
      timeout: 300_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe'
    }
  ]
});

export { WEB, API };
