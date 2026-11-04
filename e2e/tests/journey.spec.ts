import { test, expect, type Page } from '@playwright/test';
import { ACCOUNTS, monthsAgo, pickClass, signIn } from './support';

/**
 * The whole life of a new family, across the four kinds of user:
 * enrolment form → approval and invite → account activation → check-in (offline) → daily report
 * → the family sees it → invoice and payment.
 */
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString().slice(-6);
const CHILD = `Tomás Teste ${stamp}`;
const GUARDIAN = `Rita Teste ${stamp}`;
const PHONE = `84 9${stamp}`;
const NOTE = `Brincou muito no jardim (${stamp})`;
const NEW_PASSWORD = 'Familia@2026';
let inviteLink = '';

async function staffOpensChild(page: Page, path: string) {
  await signIn(page, ACCOUNTS.maria);
  await page.goto(path);
  await pickClass(page, 'Berçário A');
}

test('a family asks for a place on the public enrolment form', async ({ page }) => {
  await page.goto('/matricula');

  await page.getByLabel('Nome completo').fill(CHILD);
  await page.getByLabel('Data de nascimento').fill(monthsAgo(10));
  await page.getByRole('button', { name: 'Masculino', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Encarregados de educação' })).toBeVisible();
  await page.getByLabel('Nome completo').first().fill(GUARDIAN);
  await page.getByLabel('Relação com a criança').first().fill('mãe');
  await page.getByLabel('Telemóvel').first().fill(PHONE);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Pessoas autorizadas a buscar' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Confirmar e enviar' })).toBeVisible();
  await page.getByText('Autorizo o tratamento destes dados').click();
  await page.getByRole('button', { name: 'Enviar pedido' }).click();

  await expect(page.getByRole('heading', { name: 'Pedido enviado' })).toBeVisible();
});

test('the administration approves it and gets the invite link to share', async ({ page }) => {
  await signIn(page, ACCOUNTS.admin);
  await page.goto('/admin/matriculas');
  await page.getByRole('link', { name: new RegExp(CHILD) }).click();

  await page.locator('label', { hasText: 'Turma' }).getByRole('combobox').click();
  await page.getByRole('option', { name: /Berçário A/ }).click();
  const full = page.getByText('Aprovar na mesma');
  if (await full.isVisible()) await full.click();
  await page.getByRole('button', { name: 'Aprovar matrícula' }).click();

  // No email and no WhatsApp in this stack: the screen offers the link to share by hand
  const link = page.getByLabel('Link');
  await expect(link).toHaveValue(/\/convite\//);
  inviteLink = await link.inputValue();
});

test('the parent activates the account from the invite', async ({ page }) => {
  expect(inviteLink).not.toBe('');
  await page.goto(new URL(inviteLink).pathname);
  await page.getByLabel('Nova palavra-passe').fill(NEW_PASSWORD);
  await page.getByLabel('Confirmar palavra-passe').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Activar conta' }).click();

  await expect(page).toHaveURL(/\/responsavel$/);
  await expect(page.getByText(CHILD.split(' ')[0]).first()).toBeVisible();
});

test('the educator checks the child in without internet, and it syncs when the connection returns', async ({ page, context }) => {
  await staffOpensChild(page, '/staff/presencas');
  const row = page.getByRole('listitem').filter({ hasText: CHILD });
  await expect(row.getByRole('button', { name: 'Entrada' })).toBeVisible();

  await context.setOffline(true);
  await row.getByRole('button', { name: 'Entrada' }).click();
  await expect(row.getByText('Por enviar')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Sem internet' })).toBeVisible();

  await context.setOffline(false);
  await expect(row.getByText('Por enviar')).toBeHidden({ timeout: 30_000 });
  await expect(row).toContainText('Entrou');
});

test('the educator fills in the daily report', async ({ page }) => {
  await staffOpensChild(page, '/staff/relatorio-diario');
  await page.getByRole('link', { name: new RegExp(CHILD) }).click();
  await page.getByLabel('Nota para a família').fill(NOTE);
  await expect(page.getByRole('status').filter({ hasText: 'Enviado' })).toBeVisible({ timeout: 20_000 });
});

test('the family sees the check-in and the report', async ({ page }) => {
  await signIn(page, PHONE, NEW_PASSWORD);
  await page.goto('/responsavel');
  await expect(page.getByText(NOTE)).toBeVisible();
  await expect(page.getByText(/Na escola desde as \d{2}:\d{2}/)).toBeVisible();
});

test('the administration issues an invoice and records the payment; the family sees it paid', async ({ page }) => {
  await signIn(page, ACCOUNTS.admin);
  await page.goto('/admin/facturacao');
  await page.getByRole('button', { name: 'Nova factura' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('label', { hasText: 'Criança' }).getByRole('combobox').click();
  await page.getByRole('option', { name: CHILD }).click();
  await dialog.getByLabel('Descrição').fill('Uniforme');
  await dialog.getByLabel('Preço').fill('1500');
  await dialog.getByRole('button', { name: 'Emitir' }).click();
  await expect(dialog).toBeHidden();

  const row = page.getByRole('row').filter({ hasText: CHILD });
  await row.getByRole('button', { name: 'Registar pagamento' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Registar', exact: true }).click();
  await expect(row).toContainText('Paga');

  await signIn(page, PHONE, NEW_PASSWORD);
  await page.goto('/responsavel/facturacao');
  await expect(page.getByText('Paga').first()).toBeVisible();
});
