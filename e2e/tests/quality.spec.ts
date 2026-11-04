import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ACCOUNTS, signIn } from './support';

/**
 * Accessibility (axe, WCAG 2.1 A/AA: no serious or critical issues) and layout (no sideways
 * scrolling from 360 px phones to 1440 px laptops) on the main screens of each role.
 */
const SCREENS: { who?: string; paths: string[] }[] = [
  { paths: ['/login', '/matricula', '/recuperar-senha', '/privacidade'] },
  { who: ACCOUNTS.admin, paths: ['/admin', '/admin/matriculas', '/admin/pessoas', '/admin/facturacao', '/admin/relatorios', '/admin/notificacoes'] },
  { who: ACCOUNTS.maria, paths: ['/staff', '/staff/presencas', '/staff/relatorio-diario', '/staff/turma'] },
  { who: ACCOUNTS.ana, paths: ['/responsavel', '/responsavel/relatorios', '/responsavel/facturacao', '/responsavel/perfil'] }
];
const WIDTHS = [360, 768, 1440];

/** Anything the Content-Security-Policy blocked on the page (it must block nothing the app does). */
function watchCsp(page: Page): string[] {
  const blocked: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to (load|connect|execute|apply)/i.test(message.text())) blocked.push(message.text().slice(0, 200));
  });
  return blocked;
}

async function settle(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  // Skeletons gone: the screen shows its data
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

for (const { who, paths } of SCREENS) {
  test.describe(who ?? 'public', () => {
    test.beforeEach(async ({ page }) => {
      if (who) await signIn(page, who);
    });

    for (const path of paths) {
      test(`${path}: accessible, and fits from 360 to 1440 px`, async ({ page }) => {
        const blocked = watchCsp(page);
        await settle(page, path);
        expect(blocked, 'blocked by the Content-Security-Policy').toEqual([]);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
        // Each issue with up to 3 elements; contrast issues with their colours and ratio
        const describe = (node: (typeof serious)[number]['nodes'][number]) => {
          const data = node.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
          return `${node.target.join(' ')}${data?.contrastRatio ? ` [${data.fgColor} on ${data.bgColor}: ${data.contrastRatio}]` : ''}`;
        };
        expect(serious.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.slice(0, 3).map(describe).join(', ')})`)).toEqual([]);

        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          // The elements sticking out on the right, to say where the problem is
          const wide = await page.evaluate(() => {
            const limit = document.documentElement.clientWidth + 1;
            if (document.documentElement.scrollWidth <= limit) return [];
            return [...document.querySelectorAll('body *')]
              .filter((element) => element.getBoundingClientRect().right > limit && !element.closest('[aria-hidden="true"], .sr-only'))
              .slice(0, 4)
              .map((element) => `<${element.tagName.toLowerCase()} class="${String(element.getAttribute('class') ?? '').slice(0, 60)}"> ${(element.textContent ?? '').trim().slice(0, 30)}`);
          });
          expect(wide, `${path} scrolls sideways at ${width}px`).toEqual([]);
        }
      });
    }
  });
}

test('security headers are sent, and the policy only allows the app and its API', async ({ request }) => {
  const res = await request.get('/login');
  const headers = res.headers();
  const csp = headers['content-security-policy'] ?? '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self' http://localhost:3102");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toMatch(/script-src[^;]*(https?:|\*)/);
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-powered-by']).toBeUndefined();
});
