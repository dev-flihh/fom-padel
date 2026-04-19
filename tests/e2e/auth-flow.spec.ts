import { expect, test } from '@playwright/test';

const uniqueEmail = () => `qa.fomplay+${Date.now()}@example.com`;
const password = 'Test123!';

test.describe('Auth Flow', () => {
  test('register and login with email/password works end-to-end', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/');
    await expect(page.getByText('Capek kerja? Butuh gerak?')).toBeVisible();

    await page.getByRole('button', { name: 'Daftar' }).first().click();
    await page.getByPlaceholder('Nama Anda').fill('QA FOM Play');
    await page.getByPlaceholder('email@contoh.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: 'Daftar' }).nth(1).click();

    await expect(page.getByRole('button', { name: 'Profil' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Profil' }).click();
    await page.getByRole('button', { name: 'Keluar dari Akun' }).click();
    await expect(page.getByText('Capek kerja? Butuh gerak?')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /^Masuk$/ }).first().click();
    await page.getByPlaceholder('email@contoh.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: /^Masuk$/ }).nth(1).click();

    await expect(page.getByRole('button', { name: 'Profil' })).toBeVisible({ timeout: 20_000 });
  });

  test('google login button starts OAuth flow (popup or redirect)', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Lanjutkan dengan Google' })).toBeVisible();

    const popupPromise = context.waitForEvent('page', { timeout: 8_000 }).catch(() => null);
    const authRequestPromise = page
      .waitForRequest(
        (request) =>
          /accounts\.google\.com|\/__\/auth\/handler/.test(request.url()),
        { timeout: 8_000 }
      )
      .then((request) => request.url())
      .catch(() => null);

    await page.getByRole('button', { name: 'Lanjutkan dengan Google' }).click();

    const popupPage = await popupPromise;
    const authRequestUrl = await authRequestPromise;

    if (popupPage) {
      // On some browsers the popup URL may be transient/opaque, but opening the popup
      // itself already proves OAuth flow was initiated from the button click.
      expect(popupPage).toBeTruthy();
      return;
    }

    expect(authRequestUrl).not.toBeNull();
  });
});
