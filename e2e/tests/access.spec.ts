import { test, expect } from '@playwright/test';
import { ACCOUNTS, API, apiGet, apiLogin, signIn } from './support';

/** Each kind of user only reaches its own screens and its own records, by URL or by ID. */

test.describe('screens by role', () => {
  test('without a session, every area sends to the login page', async ({ page }) => {
    for (const path of ['/admin', '/staff', '/responsavel']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  const cases = [
    { who: ACCOUNTS.ana, home: '/responsavel', others: ['/admin/pessoas', '/staff/presencas'] },
    { who: ACCOUNTS.maria, home: '/staff', others: ['/admin/facturacao', '/responsavel/facturacao'] },
    { who: ACCOUNTS.admin, home: '/admin', others: ['/staff/presencas', '/responsavel'] }
  ];
  for (const { who, home, others } of cases) {
    test(`${who} is sent back to ${home} from other areas`, async ({ page }) => {
      await signIn(page, who);
      for (const path of others) {
        await page.goto(path);
        await expect(page).toHaveURL(new RegExp(`${home}$`));
      }
    });
  }
});

test.describe('records by ID (API)', () => {
  test('a parent can’t read another family’s child, reports or invoices', async ({ request }) => {
    const ana = await apiLogin(request, ACCOUNTS.ana);
    const carlos = await apiLogin(request, ACCOUNTS.carlos);
    const carlosChildren = (await apiGet(request, carlos, '/children')).body.data as { _id: string }[];
    const carlosInvoices = (await apiGet(request, carlos, '/invoices')).body.data as { _id: string }[];
    expect(carlosChildren.length).toBeGreaterThan(0);

    const theirChild = carlosChildren[0]._id;
    expect((await apiGet(request, ana, `/children/${theirChild}`)).status).toBe(404);
    expect((await apiGet(request, ana, `/attendance?child_id=${theirChild}`)).status).toBe(404);
    expect((await apiGet(request, ana, `/daily-reports?child_id=${theirChild}`)).status).toBe(404);
    if (carlosInvoices.length) expect((await apiGet(request, ana, `/invoices/${carlosInvoices[0]._id}`)).status).toBe(404);

    // Her own lists hold none of his records
    const anaChildren = (await apiGet(request, ana, '/children')).body.data as { _id: string }[];
    expect(anaChildren.map((child) => child._id)).not.toContain(theirChild);
    const anaInvoices = (await apiGet(request, ana, `/invoices?parent_id=${carlos.user.id}`)).body?.data ?? [];
    for (const invoice of anaInvoices as { parent_id: string | { _id: string } }[]) {
      expect(typeof invoice.parent_id === 'string' ? invoice.parent_id : invoice.parent_id._id).toBe(ana.user.id);
    }
  });

  test('an educator only reaches the children of their own classes', async ({ request }) => {
    const maria = await apiLogin(request, ACCOUNTS.maria);
    const joao = await apiLogin(request, ACCOUNTS.joao);
    const mariaChildren = (await apiGet(request, maria, '/children')).body.data as { _id: string }[];
    const joaoChildren = (await apiGet(request, joao, '/children')).body.data as { _id: string }[];
    const theirs = mariaChildren.find((child) => !joaoChildren.some((other) => other._id === child._id));
    expect(theirs, 'a child only Maria teaches').toBeDefined();
    expect((await apiGet(request, joao, `/children/${theirs!._id}`)).status).toBe(404);
  });

  test('administration-only endpoints refuse families and educators', async ({ request }) => {
    for (const who of [ACCOUNTS.ana, ACCOUNTS.maria]) {
      const session = await apiLogin(request, who);
      for (const path of ['/notifications', '/reports/finance/summary', '/expenses']) {
        expect((await apiGet(request, session, path)).status, `${who} GET ${path}`).toBe(403);
      }
    }
    const ana0 = await apiLogin(request, ACCOUNTS.ana);
    expect((await apiGet(request, ana0, '/users')).status).toBe(403);

    // People: educators see colleagues and only the parents of their own children (for Mensagens)
    const maria = await apiLogin(request, ACCOUNTS.maria);
    const ownParents = new Set(((await apiGet(request, maria, '/children')).body.data as { parent_id: string | { _id: string } }[]).map((child) => (typeof child.parent_id === 'string' ? child.parent_id : child.parent_id._id)));
    const parents = (await apiGet(request, maria, '/users?role=responsavel&limit=100')).body.data as { id: string }[];
    for (const parent of parents) expect(ownParents.has(parent.id), `Maria sees parent ${parent.id}`).toBe(true);

    // Payments: families see their own history; educators see none
    expect((await apiGet(request, maria, '/payments')).status).toBe(403);
    const ana = await apiLogin(request, ACCOUNTS.ana);
    const payments = (await apiGet(request, ana, '/payments')).body.data as { parent_id: string | { _id: string } }[];
    for (const payment of payments) expect(typeof payment.parent_id === 'string' ? payment.parent_id : payment.parent_id._id).toBe(ana.user.id);
    const write = await request.post(`${API}/attendance`, { headers: { Authorization: `Bearer ${ana.token}` }, data: {} });
    expect(write.status()).toBe(403);
  });
});
