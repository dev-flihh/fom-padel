import { expect, test } from '@playwright/test';

test.describe('FOM Rewind Flow', () => {
  test('banner appears on ended match and generates rewind without photos', async ({ page }) => {
    await page.goto('/app?e2e=toxic-standings');

    // FR-4.2/4.3 — banner strip on Klasemen when ENDED
    const banner = page.getByRole('button', { name: 'Bikin FOM Rewind' });
    await expect(banner).toBeVisible();
    await banner.click();

    // FR-5 — upload page, generate allowed with 0 photos (FR-5.6)
    await expect(page.getByText('Every mabar deserves')).toBeVisible();
    await expect(page.getByText('0 of 10 photos')).toBeVisible();
    await page.getByRole('button', { name: 'Generate Rewind' }).click();

    // FR-6.3 — loading state, then viewer
    await expect(page.getByText(/Menyiapkan slide/)).toBeVisible();
    await expect(page.getByText(/1 \/ \d+ · Cover/)).toBeVisible({ timeout: 45000 });

    // Viewer chrome (FR-8): share/download per slide + menu + close
    const rewindDialog = page.getByRole('dialog', { name: 'FOM Rewind' });
    await expect(rewindDialog.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
    await expect(rewindDialog.getByRole('button', { name: 'Download', exact: true })).toBeVisible();
    await expect(rewindDialog.getByRole('button', { name: 'Menu Rewind' })).toBeVisible();

    // FR-8.2 — tap right 60% = next, tap left 40% = back
    const stage = page.getByRole('group', { name: /Slide 1 dari/ });
    const box = await stage.boundingBox();
    if (!box) throw new Error('slide stage not found');
    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2);
    await expect(page.getByText(/2 \/ \d+ · The Numbers/)).toBeVisible();
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height / 2);
    await expect(page.getByText(/1 \/ \d+ · Cover/)).toBeVisible();

    // Toxic ON fixture → gold slides + max 3 sertifikat (+ My Card kalau login)
    const label = await page.getByText(/1 \/ \d+ · Cover/).innerText();
    const total = Number(label.match(/1 \/ (\d+)/)?.[1] || 0);
    expect(total).toBeGreaterThanOrEqual(8);
    expect(total).toBeLessThanOrEqual(17);

    // Close viewer → banner switches to "View FOM Rewind" (in-session state)
    await page.getByRole('button', { name: 'Tutup Rewind' }).click();
    await expect(page.getByRole('button', { name: 'View FOM Rewind' })).toBeVisible();

    // Reopen goes straight to viewer (FR-4.3 generated state)
    await page.getByRole('button', { name: 'View FOM Rewind' }).click();
    await expect(page.getByText(/\d+ \/ \d+ ·/)).toBeVisible();
  });

  test('rewind banner is hidden while match is still live', async ({ page }) => {
    await page.goto('/app?e2e=toxic-empty');
    await expect(page.locator('main').getByText('Masih observasi.')).toBeVisible();
    await expect(page.getByRole('button', { name: /FOM Rewind/ })).toHaveCount(0);
  });
});
