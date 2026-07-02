import { expect, test } from '@playwright/test';

test.describe('Toxic Standings', () => {
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

  test('toxic mode off keeps normal standings clean', async ({ page }) => {
    await page.goto('/app?e2e=standings-6p');

    await expect(page.getByText('Ranking Player')).toBeVisible();
    await expect(page.getByText('Hall of Shame')).toHaveCount(0);
    await expect(page.getByText(/King of Cupu/i)).toHaveCount(0);
  });

  test('toxic mode opens Hall of Shame by default and can switch back', async ({ page }) => {
    await page.goto('/app?e2e=toxic-standings');

    await expect(page.getByText('Hall of Shame').first()).toBeVisible();
    await expect(page.getByText(/King of Cupu/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share the Shame' })).toBeVisible();

    await page.getByRole('button', { name: 'Standings', exact: true }).click();
    await expect(page.getByText('Ranking Player')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share Standings', exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Hall of Shame/i }).click();
    await expect(page.getByText(/All roasts are about this match only/i)).toBeVisible();
  });

  test('toxic empty state appears before score progress', async ({ page }) => {
    await page.goto('/app?e2e=toxic-empty');

    const main = page.locator('main');
    await expect(main.getByText('Belum ada korban.')).toBeVisible();
    await expect(main.getByText('Main dulu, baru kita hina.')).toBeVisible();
    await expect(page.getByText(/King of Cupu/i)).toHaveCount(0);
  });

  test('shared viewer can see toxic tab read-only', async ({ page }) => {
    await page.goto('/app?e2e=toxic-shared');

    await expect(page.getByText('This page is read-only.')).toBeVisible();
    await expect(page.getByText('Hall of Shame').first()).toBeVisible();
    await expect(page.getByText(/King of Cupu/i).first()).toBeVisible();
    await expect(page.getByText('Wanna try FOM Play?')).toBeVisible();
  });

  test('shared toxic CTA reuses the standings link', async ({ page }) => {
    await page.goto('/app?e2e=toxic-shared');

    await page.getByRole('button', { name: 'Share the Shame' }).click();
    await expect(page.getByText('Copied Link')).toBeVisible();

    const copiedTexts = await page.evaluate(() => (window as any).__copiedTexts as string[]);
    const lastCopiedText = copiedTexts[copiedTexts.length - 1] || '';
    expect(lastCopiedText).toContain('/app?e2e=toxic-shared');
    expect(lastCopiedText).toContain('view=klasemen');
    expect(lastCopiedText).not.toContain('view=toxic');
  });

  test('toxic story image opens a story preview', async ({ page }) => {
    await page.goto('/app?e2e=toxic-standings');

    await page.getByRole('button', { name: 'Share standings' }).click();
    await expect(page.getByRole('menuitem', { name: 'Toxic Story' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Toxic Story' }).click();

    const dialog = page.getByRole('dialog', { name: 'Story standings preview' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('img[alt="Generated standings story"]')).toBeVisible();
  });
});
