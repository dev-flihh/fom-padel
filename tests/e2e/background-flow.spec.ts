import { expect, test } from '@playwright/test';

// Appearance step & background picker dihapus (PRD Match Creation v2 §5.3):
// wizard 4 langkah, generate langsung ke layar match dengan background default.
test.describe('Match Creation Without Appearance Step', () => {
  test('wizard has 4 steps and review has no color/background rows', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await expect(page.getByRole('heading', { name: 'Name your match.' })).toBeVisible();
    await expect(page.getByText('Step 1 of 4')).toBeVisible();

    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Add players.' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Langkah ke-4 langsung Review — tidak ada langkah Appearance.
    await expect(page.getByRole('heading', { name: 'Review setup.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose appearance.' })).toHaveCount(0);
    await expect(page.getByText('Background', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Color', { exact: true })).toHaveCount(0);
  });

  test('generate goes straight to the active match with the clean production surface', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Review setup.' })).toBeVisible();
    await page.getByRole('button', { name: 'Generate Match' }).click();

    // Tidak ada layar "Select Background" setelah generate.
    await expect(page.getByRole('heading', { name: 'Select Background' })).toHaveCount(0);
    await expect(page.getByText(/Round 1/i).first()).toBeVisible();
    await expect(page.locator('img[alt="Active background"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Standings' }).first().click();
    await expect(page.getByText('Standings').first()).toBeVisible();
    await expect(page.locator('img[alt="Standings background"]')).toHaveCount(0);
  });
});
