import { expect, test } from '@playwright/test';

test.describe('Share Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const copiedTexts: string[] = [];
      Object.defineProperty(window, '__copiedTexts', {
        configurable: true,
        value: copiedTexts,
      });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            copiedTexts.push(text);
          },
        },
      });
    });
  });

  test('active match share copies the live link and shows toast feedback', async ({ page }) => {
    await page.goto('/app?e2e=share-flow');

    await expect(page.getByText(/Round 1/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Share match' }).click();

    await expect(page.getByText('Copied Link')).toBeVisible();
    await expect(page.getByText('Link berhasil disalin.')).toBeVisible();

    const copiedTexts = await page.evaluate(() => (window as any).__copiedTexts as string[]);
    const lastCopiedText = copiedTexts[copiedTexts.length - 1] || '';
    expect(lastCopiedText).toContain('/m/e2eshare');
    expect(lastCopiedText).not.toContain('klasemen');
  });

  test('standings share copies the standings link and shows toast feedback', async ({ page }) => {
    await page.goto('/app?e2e=share-flow');

    await expect(page.getByRole('button', { name: 'Standings', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Standings', exact: true }).click();
    await expect(page.getByText('Standings').first()).toBeVisible();

    await page.getByRole('button', { name: 'Share match link', exact: true }).click();

    await expect(page.getByText('Copied Link')).toBeVisible();
    const copiedTexts = await page.evaluate(() => (window as any).__copiedTexts as string[]);
    const lastCopiedText = copiedTexts[copiedTexts.length - 1] || '';
    expect(lastCopiedText).toContain('/m/e2eshare/klasemen');
  });

  test('guest shared active view shows the FOM Play trial CTA', async ({ page }) => {
    await page.goto('/app?e2e=shared-viewer-flow');

    await expect(page.getByText('Read-only · Shared view')).toBeVisible();
    await expect(page.getByText('Hosted with FOM Play')).toBeVisible();
    await expect(page.getByText('View Only')).toHaveCount(0);
    await page.getByRole('button', { name: 'Share match' }).click();
    await expect(page.getByText('Copied Link')).toBeVisible();

    const copiedTexts = await page.evaluate(() => (window as any).__copiedTexts as string[]);
    const lastCopiedText = copiedTexts[copiedTexts.length - 1] || '';
    expect(lastCopiedText).toContain('/app?e2e=shared-viewer-flow');
    expect(lastCopiedText).not.toContain('view=klasemen');

    const cta = page.getByRole('link', { name: /Start yours/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', 'https://fomplay.asia/');
  });

  test('guest shared standings view shows the FOM Play trial CTA', async ({ page }) => {
    await page.goto('/app?e2e=shared-viewer-flow&view=klasemen');

    await expect(page.getByText('Read-only · Shared view')).toBeVisible();
    await expect(page.getByText('Hosted with FOM Play')).toBeVisible();
    await expect(page.getByText('View Only')).toHaveCount(0);
    // Semua generate image pindah ke FOM Rewind — share cukup satu tombol link.
    await page.getByRole('button', { name: 'Share match link' }).click();
    await expect(page.getByText('Copied Link')).toBeVisible();
    await expect(page.locator('[data-share-exporter="true"]')).toHaveCount(0);

    const cta = page.getByRole('link', { name: /Start yours/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', 'https://fomplay.asia/');
  });

  test('host share flow does not show the guest trial CTA', async ({ page }) => {
    await page.goto('/app?e2e=share-flow');

    await expect(page.getByText('Hosted with FOM Play')).toHaveCount(0);
  });
});
