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

    await expect(page.getByRole('heading', { name: 'Pengaturan Pertandingan' })).toBeVisible();
    const generateButton = page.getByRole('button', { name: 'Generate' });
    await expect(generateButton).toBeEnabled();

    await generateButton.click();

    await expect(page.getByRole('heading', { name: 'Pilih Background' })).toBeVisible();
    const continueButton = page.getByRole('button', { name: 'Lanjut ke Preview' });
    await expect(continueButton).toBeDisabled();

    const firstBackgroundImage = page.locator('img[alt="Background 1"]').first();
    const selectedBackgroundSrc = await firstBackgroundImage.getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await firstBackgroundImage.click();
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await expect(page.getByRole('heading', { name: 'Preview Pertandingan' })).toBeVisible();
    const previewBackgroundSrc = await page.locator('img[alt="Preview background"]').first().getAttribute('src');
    expect(previewBackgroundSrc).toBe(selectedBackgroundSrc);
  });

  test('skip random stays locked when navigating back and forth from preview', async ({ page }) => {
    await page.goto('/?e2e=background-flow');

    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByRole('heading', { name: 'Pilih Background' })).toBeVisible();

    await page.getByRole('button', { name: 'Lewati (Random)' }).click();
    await expect(page.getByRole('heading', { name: 'Preview Pertandingan' })).toBeVisible();
    const previewBackground = page.locator('img[alt="Preview background"]').first();
    await expect(previewBackground).toBeVisible();
    const firstPreviewBackgroundSrc = await previewBackground.getAttribute('src');
    expect(firstPreviewBackgroundSrc).not.toBeNull();
    expect(matchPlayBackgroundPool).toContain(firstPreviewBackgroundSrc as string);

    await page.locator('header button').first().click();
    await expect(page.getByRole('heading', { name: 'Pilih Background' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lanjut ke Preview' })).toBeEnabled();

    await page.getByRole('button', { name: 'Lanjut ke Preview' }).click();
    await expect(page.getByRole('heading', { name: 'Preview Pertandingan' })).toBeVisible();
    const secondPreviewBackgroundSrc = await page.locator('img[alt="Preview background"]').first().getAttribute('src');
    expect(secondPreviewBackgroundSrc).toBe(firstPreviewBackgroundSrc);
  });

  test('selected background remains consistent in preview, active match, and standings', async ({ page }) => {
    await page.goto('/?e2e=background-flow');

    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByRole('heading', { name: 'Pilih Background' })).toBeVisible();

    const selectedBackground = page.locator('img[alt="Background 2"]').first();
    const selectedBackgroundSrc = await selectedBackground.getAttribute('src');
    expect(selectedBackgroundSrc).not.toBeNull();

    await selectedBackground.click();
    await page.getByRole('button', { name: 'Lanjut ke Preview' }).click();

    await expect(page.getByRole('heading', { name: 'Preview Pertandingan' })).toBeVisible();
    const previewBackgroundSrc = await page.locator('img[alt="Preview background"]').first().getAttribute('src');
    expect(previewBackgroundSrc).toBe(selectedBackgroundSrc);

    await page.getByRole('button', { name: 'Mulai' }).click();
    const activeBackground = page.locator('img[alt="Active background"]').first();
    await expect(activeBackground).toBeVisible();
    const activeBackgroundSrc = await activeBackground.getAttribute('src');
    expect(activeBackgroundSrc).toBe(selectedBackgroundSrc);

    await page.getByRole('button', { name: /Lihat Klasemen/i }).first().click();
    await expect(page.getByText('Ranking Pemain')).toBeVisible();
    const standingsBackgroundSrc = await page.locator('img[alt="Standings background"]').first().getAttribute('src');
    expect(standingsBackgroundSrc).toBe(selectedBackgroundSrc);
  });
});
