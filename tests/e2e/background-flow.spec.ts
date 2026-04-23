import { expect, test } from '@playwright/test';

const matchPlayBackgroundPool = [
  '/mockups/active-v2/images/match-01.jpg',
  '/mockups/active-v2/images/Match-02.jpg',
  '/mockups/active-v2/images/Match-03.jpg',
  '/mockups/active-v2/images/match-04.jpg',
  '/mockups/active-v2/images/match-05.jpg',
  '/mockups/active-v2/images/match-06.jpg',
  '/mockups/active-v2/images/Match-07.jpg',
  '/mockups/active-v2/images/match-08.jpg'
];

test.describe('Background Picker Flow', () => {
  test('manual background selection is applied to preview', async ({ page }) => {
    await page.goto('/?e2e=background-flow');

    await expect(page.getByRole('heading', { name: 'Set Up Match' })).toBeVisible();
    const generateButton = page.getByRole('button', { name: 'Generate Match' });
    await expect(generateButton).toBeEnabled();

    await generateButton.click();

    await expect(page.getByRole('heading', { name: 'Select Background' })).toBeVisible();
    const continueButton = page.getByRole('button', { name: 'Continue to Match' });
    await expect(continueButton).toBeDisabled();

    const firstBackgroundImage = page.locator('img[alt="Background 1"]').first();
    const selectedBackgroundSrc = await firstBackgroundImage.getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await firstBackgroundImage.click();
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    const activeBackgroundSrc = await page.locator('img[alt="Active background"]').first().getAttribute('src');
    expect(activeBackgroundSrc).toBe(selectedBackgroundSrc);
  });

  test('skip random applies one match background', async ({ page }) => {
    await page.goto('/?e2e=background-flow');

    await page.getByRole('button', { name: 'Generate Match' }).click();
    await expect(page.getByRole('heading', { name: 'Select Background' })).toBeVisible();

    await page.getByRole('button', { name: 'Skip (Random)' }).click();
    const activeBackground = page.locator('img[alt="Active background"]').first();
    await expect(activeBackground).toBeVisible();
    const activeBackgroundSrc = await activeBackground.getAttribute('src');
    expect(activeBackgroundSrc).not.toBeNull();
    expect(matchPlayBackgroundPool).toContain(activeBackgroundSrc as string);
  });

  test('selected background remains consistent in preview, active match, and standings', async ({ page }) => {
    await page.goto('/?e2e=background-flow');

    await page.getByRole('button', { name: 'Generate Match' }).click();
    await expect(page.getByRole('heading', { name: 'Select Background' })).toBeVisible();

    const selectedBackground = page.locator('img[alt="Background 2"]').first();
    const selectedBackgroundSrc = await selectedBackground.getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await selectedBackground.click();
    await page.getByRole('button', { name: 'Continue to Match' }).click();
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
