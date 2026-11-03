import { test, expect } from '@playwright/test';
import { ACCOUNTS, API, apiGet, apiLogin, monthsAgo, pickClass, serviceWorkerReady, signIn } from './support';

/**
 * A tablet that loses its connection and is closed: what was recorded stays on the device, the
 * app opens again without internet, and everything is sent once the connection returns.
 */
test('an attendance recorded offline survives closing the app and is sent later', async ({ page, context, request }) => {
  // A child nobody has checked in today (the seed already did the others)
  const admin = await apiLogin(request, ACCOUNTS.admin);
  const ana = await apiLogin(request, ACCOUNTS.ana);
  const classes = (await apiGet(request, admin, '/classes')).body.data as { _id: string; name: string }[];
  const name = `Leonor Offline ${Date.now().toString().slice(-6)}`;
  const created = await request.post(`${API}/children`, {
    headers: { Authorization: `Bearer ${admin.token}` },
    data: { name, birth_date: monthsAgo(20), class_id: classes.find((item) => item.name === 'Maternal I')!._id, parent_id: ana.user.id }
  });
  expect(created.ok()).toBeTruthy();

  await signIn(page, ACCOUNTS.maria);
  await page.goto('/staff/presencas');
  await serviceWorkerReady(page);
  await pickClass(page, 'Maternal I');
  const row = page.getByRole('listitem').filter({ hasText: name });
  await expect(row.getByRole('button', { name: 'Entrada' })).toBeVisible();

  await context.setOffline(true);
  await row.getByRole('button', { name: 'Entrada' }).click();
  await expect(row.getByText('Por enviar')).toBeVisible();

  // "Restart": close the page and open the app again, still without internet
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/staff/presencas');
  await expect(reopened.getByRole('status').filter({ hasText: /guardado neste aparelho/ })).toBeVisible();
  await pickClass(reopened, 'Maternal I');
  const again = reopened.getByRole('listitem').filter({ hasText: name });
  await expect(again.getByText('Por enviar')).toBeVisible();

  await context.setOffline(false);
  await expect(again.getByText('Por enviar')).toBeHidden({ timeout: 45_000 });
  await expect(again).toContainText('Entrou');
});
