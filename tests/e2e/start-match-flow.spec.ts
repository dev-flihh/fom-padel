import { expect, test } from '@playwright/test';

test.describe('Start Match Flow', () => {
  test('dashboard can start a prepared draft and open the active match', async ({ page }) => {
    await page.goto('/app?e2e=start-match-flow');

    await expect(page.getByText('Welcome back')).toBeVisible();
    await page.getByText('Start Match').click();

    await expect(page.getByRole('heading', { name: 'Name your match.' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Review setup.' })).toBeVisible();
    await page.getByRole('button', { name: 'Generate Match' }).click();

    const backgroundHeading = page.getByRole('heading', { name: 'Select Background' });
    if (await backgroundHeading.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Skip (Random)' }).click();
    }

    await expect(page.locator('img[alt="Active background"]').first()).toBeVisible();
    await expect(page.getByText(/Round 1/i).first()).toBeVisible();
  });
});
