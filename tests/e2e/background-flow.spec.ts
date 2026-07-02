import { expect, test } from '@playwright/test';

const goToAppearanceStep = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('heading', { name: 'Name your match.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose appearance.' })).toBeVisible();
};

const generateFromAppearanceStep = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Review setup.' })).toBeVisible();
  await page.getByRole('button', { name: 'Generate Match' }).click();
};

test.describe('Background Picker Flow', () => {
  test('manual background selection is applied to review preview', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await goToAppearanceStep(page);

    const firstBackgroundImage = page.locator('img[alt="Mexicano background 1"]').first();
    const selectedBackgroundSrc = await firstBackgroundImage.getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await firstBackgroundImage.click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Review setup.' })).toBeVisible();

    const reviewBackgroundSrc = await page.locator('img[alt="Background preview"]').first().getAttribute('src');
    expect(reviewBackgroundSrc).toBe(selectedBackgroundSrc);
  });

  test('default appearance applies one match background to review', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await goToAppearanceStep(page);
    const selectedBackgroundSrc = await page.locator('img[alt="Selected background preview"]').first().getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Review setup.' })).toBeVisible();
    const reviewBackground = page.locator('img[alt="Background preview"]').first();
    await expect(reviewBackground).toBeVisible();
    const reviewBackgroundSrc = await reviewBackground.getAttribute('src');
    expect(reviewBackgroundSrc).toBe(selectedBackgroundSrc);
  });

  test('active match and standings use the clean production surface without photo blur', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await goToAppearanceStep(page);

    const selectedBackground = page.locator('img[alt="Mexicano background 2"]').first();
    const selectedBackgroundSrc = await selectedBackground.getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await selectedBackground.click();
    await generateFromAppearanceStep(page);
    await expect(page.getByText(/Round 1/i).first()).toBeVisible();
    await expect(page.locator('img[alt="Active background"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Standings' }).first().click();
    await expect(page.getByText('Standings').first()).toBeVisible();
    await expect(page.locator('img[alt="Standings background"]')).toHaveCount(0);
  });
});
