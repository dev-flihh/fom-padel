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
  test('manual background selection is applied to preview', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await goToAppearanceStep(page);

    const firstBackgroundImage = page.locator('img[alt="Mexicano background 1"]').first();
    const selectedBackgroundSrc = await firstBackgroundImage.getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await firstBackgroundImage.click();
    await generateFromAppearanceStep(page);

    const activeBackgroundSrc = await page.locator('img[alt="Active background"]').first().getAttribute('src');
    expect(activeBackgroundSrc).toBe(selectedBackgroundSrc);
  });

  test('default appearance applies one match background', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await goToAppearanceStep(page);
    const selectedBackgroundSrc = await page.locator('img[alt="Selected background preview"]').first().getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await generateFromAppearanceStep(page);
    const activeBackground = page.locator('img[alt="Active background"]').first();
    await expect(activeBackground).toBeVisible();
    const activeBackgroundSrc = await activeBackground.getAttribute('src');
    expect(activeBackgroundSrc).toBe(selectedBackgroundSrc);
  });

  test('selected background remains consistent in preview, active match, and standings', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await goToAppearanceStep(page);

    const selectedBackground = page.locator('img[alt="Mexicano background 2"]').first();
    const selectedBackgroundSrc = await selectedBackground.getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await selectedBackground.click();
    await generateFromAppearanceStep(page);
    const activeBackground = page.locator('img[alt="Active background"]').first();
    await expect(activeBackground).toBeVisible();
    const activeBackgroundSrc = await activeBackground.getAttribute('src');
    expect(activeBackgroundSrc).toBe(selectedBackgroundSrc);

    await page.getByRole('button', { name: /View Live Standings/i }).first().click();
    await expect(page.getByText('Ranking Player')).toBeVisible();
    const standingsBackgroundSrc = await page.locator('img[alt="Standings background"]').first().getAttribute('src');
    expect(standingsBackgroundSrc).toBe(selectedBackgroundSrc);
  });
});
