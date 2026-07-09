import { expect, test } from '@playwright/test';

test.describe('Start Match Flow', () => {
  test('dashboard can start a prepared draft and open the active match', async ({ page }) => {
    await page.goto('/app?e2e=start-match-flow');

    await expect(page.getByText('Welcome back')).toBeVisible();
    await page.getByText('Start Match').click();

    // Wizard v2: 4 langkah (Info → Format → Players → Review), tanpa Appearance.
    await expect(page.getByRole('heading', { name: 'Name your match.' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Review setup.' })).toBeVisible();
    await page.getByRole('button', { name: 'Generate Match' }).click();

    // Generate langsung ke layar match — layar pilih background sudah dihapus.
    await expect(page.getByRole('heading', { name: 'Select Background' })).toHaveCount(0);
    await expect(page.getByText(/Round 1/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share match' })).toBeVisible();
    await expect(page.locator('img[alt="Active background"]')).toHaveCount(0);
  });
});
