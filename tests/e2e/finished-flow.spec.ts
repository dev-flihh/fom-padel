import { expect, test } from '@playwright/test';

test.describe('Finished Tournament Flow', () => {
  test('history detail can open read-only match details and final standings', async ({ page }) => {
    await page.goto('/?e2e=finished-flow');

    await expect(page.getByRole('heading', { name: 'Detail Riwayat' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Detail Per Round' })).toBeVisible();

    await page.getByRole('button', { name: 'Detail Per Round' }).click();

    await expect(page.getByText('Berakhir')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Selesaikan Turnamen' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ronde Berikutnya' })).toHaveCount(0);

    await page.getByRole('button', { name: /Lihat Klasemen Akhir/i }).click();

    await expect(page.getByText('Ranking Pemain')).toBeVisible();
    await expect(page.getByText('Berakhir')).toBeVisible();
    await expect(page.getByText('Match 12/12')).toBeVisible();
  });
});
