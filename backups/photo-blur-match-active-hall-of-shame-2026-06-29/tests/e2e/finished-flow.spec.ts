import { expect, test } from '@playwright/test';

test.describe('Finished Tournament Flow', () => {
  test('history detail can open read-only match details and final standings', async ({ page }) => {
    await page.goto('/app?e2e=finished-flow');

    await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
    await expect(page.getByText('Event recap')).toBeVisible();
    await expect(page.getByText('Players')).toBeVisible();
    await expect(page.getByText('Rounds')).toBeVisible();
    await expect(page.getByText('Courts')).toBeVisible();
    await expect(page.getByText('Format')).toBeVisible();
    await expect(page.getByText('Match history')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Round Details' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Round Details' }).first().click();

    await expect(page.getByText('Ended')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finish Matches' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next Round' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Standings' }).first().click();

    await expect(page.getByText('Ranking Player')).toBeVisible();
    await expect(page.getByText('Ended')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rounds' })).toBeVisible();
  });
});
