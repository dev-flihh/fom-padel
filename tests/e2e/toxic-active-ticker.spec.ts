import { expect, test } from '@playwright/test';

const getScoreControls = (scoreInput: import('@playwright/test').Locator) => (
  scoreInput.locator('xpath=..')
);

test.describe('Toxic Active Ticker', () => {
  test('shows a data-driven live shame ticker for a blowout score', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    await expect(page.getByText('Zona Cupu').first()).toBeVisible();
    await expect(page.getByText('Needs 1 pt')).toBeVisible();
    await expect(page.getByText('1 point left on Court 1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finish score first' })).toBeDisabled();
    await expect(page.getByText('Breaking Shame')).toBeVisible();
    await expect(page.getByText(/Kasyf & Wildan disekolahkan 0-5\./)).toBeVisible();
    await expect(page.getByText('Court 1').first()).toBeVisible();
    await expect(page.getByText('1/2')).toBeVisible();
    const tickerButton = page.getByRole('button', { name: /Open Hall of Shame standings\. Zona Cupu\./i });
    await expect(tickerButton).toHaveAttribute('aria-live', 'polite');
    await expect(tickerButton).toHaveAttribute('aria-atomic', 'true');
    await expect(tickerButton).toHaveAccessibleName(/Kasyf & Wildan disekolahkan 0-5/i);
    await expect(tickerButton).toHaveAccessibleName(/Evidence: Court 1, 0-5/i);

    await expect(page.getByText('Duo Watch')).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText(/Duo Petaka mulai terbentuk\./)).toBeVisible();
    await expect(page.getByText(/2x kalah/i).first()).toBeVisible();
  });

  test('score can be edited inline without opening the old score modal', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    const scores = page.getByRole('textbox', { name: /^Score for / });
    await expect(scores).toHaveCount(2);

    await scores.first().click();
    await expect(scores.first()).toBeFocused();
    await scores.first().fill('3');

    await expect(scores.first()).toHaveValue('3');
    await expect(scores.nth(1)).toHaveValue('3');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('score inline controls handle plus, minus, clear to zero, and target score', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    const scores = page.getByRole('textbox', { name: /^Score for / });
    await expect(scores).toHaveCount(2);
    const firstScoreControls = getScoreControls(scores.first());

    await firstScoreControls.getByRole('button', { name: /^Increase score for / }).click();
    await expect(scores.first()).toHaveValue('6');
    await expect(scores.nth(1)).toHaveValue('0');
    await expect(page.getByText('Score Ready')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next Round' })).toBeEnabled();

    await firstScoreControls.getByRole('button', { name: /^Decrease score for / }).click();
    await expect(scores.first()).toHaveValue('5');
    await expect(scores.nth(1)).toHaveValue('1');

    await scores.first().fill('');
    await scores.nth(1).click();
    await expect(scores.first()).toHaveValue('0');
    await expect(scores.nth(1)).toHaveValue('6');
    await expect(firstScoreControls.getByRole('button', { name: /^Decrease score for / })).toBeDisabled();

    await scores.first().fill('6');
    await expect(scores.first()).toHaveValue('6');
    await expect(scores.nth(1)).toHaveValue('0');
    await expect(page.getByRole('button', { name: 'Next Round' })).toBeEnabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('completed non-match-play score stays inline editable without score modal', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    await page.getByRole('button', { name: 'Open round 1' }).click();
    await expect(page.getByText('Completed').first()).toBeVisible();

    const scores = page.getByRole('textbox', { name: /^Score for / });
    await expect(scores).toHaveCount(2);
    await expect(scores.first()).toBeEnabled();

    await scores.first().fill('4');
    await expect(scores.first()).toHaveValue('4');
    await expect(scores.nth(1)).toHaveValue('2');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
