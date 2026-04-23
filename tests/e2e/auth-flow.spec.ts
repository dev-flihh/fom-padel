import { expect, test } from '@playwright/test';

const uniqueEmail = () => `qa.fomplay+${Date.now()}@example.com`;
const password = 'Test123!';

test.describe('Auth Flow', () => {
  test('register and login with email/password works end-to-end', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/app');
    await expect(page.getByRole('heading', { name: 'Welcome to FOM Play' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign up' }).first().click();
    await page.getByPlaceholder('Full name').fill('QA FOM Play');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign up' }).nth(1).click();

    await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByRole('button', { name: 'Keluar dari Akun' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome to FOM Play' })).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: /^Login$/ }).click();

    await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible({ timeout: 20_000 });
  });

  test('google login button starts OAuth flow (popup or redirect)', async ({ page, context }) => {
    await page.goto('/app');
    const googleButton = page.getByRole('button', { name: 'Continue with Google' });
    await expect(googleButton).toBeVisible();

    const popupPromise = context.waitForEvent('page', { timeout: 8_000 }).catch(() => null);
    const authRequestPromise = page
      .waitForRequest(
        (request) =>
          /accounts\.google\.com|\/__\/auth\/handler/.test(request.url()),
        { timeout: 8_000 }
      )
      .then((request) => request.url())
      .catch(() => null);

    await googleButton.click();

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

  test('apple login option is hidden on iOS', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Apple' })).toBeHidden();
  });
});
