import { expect, test } from '@playwright/test';

test.describe('Manage Match Sheet', () => {
  test('host can navigate core manage match actions in one sheet', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    await page.getByRole('button', { name: 'Open manage match' }).click();
    await expect(page.getByRole('heading', { name: 'Manage match' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Edit courts 1 court/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Edit rounds 3 rounds/i })).toBeVisible();

    await page.getByRole('button', { name: /Edit courts/i }).click();
    await expect(page.getByRole('heading', { name: 'Edit courts' })).toBeVisible();
    await page.locator('input[type="number"]').fill('2');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Manage match' })).toBeVisible();
    await expect(page.getByText('2 courts').first()).toBeVisible();

    await page.getByRole('button', { name: /Edit rounds/i }).click();
    await expect(page.getByRole('heading', { name: 'Edit rounds' })).toBeVisible();
    await page.locator('input[type="number"]').fill('4');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Manage match' })).toBeVisible();
    await expect(page.getByText('4 rounds').first()).toBeVisible();

    await page.getByRole('button', { name: /Players/i }).click();
    await expect(page.getByRole('heading', { name: 'Edit players' })).toBeVisible();
    await page.getByRole('button', { name: 'Link FOM profile for Falih' }).click();
    await expect(page.getByRole('heading', { name: 'Link FOM friend' })).toBeVisible();
    await expect(page.getByText('Reza FOM')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Edit players' })).toBeVisible();

    await page.getByRole('button', { name: /Add player/i }).click();
    await expect(page.getByRole('heading', { name: 'Add player' })).toBeVisible();
    await page.getByRole('button', { name: 'Save player' }).click();
    await expect(page.getByText('Enter player name.')).toBeVisible();
    await page.getByPlaceholder('Example: Falih Hermon').fill('QA Extra');
    await page.getByRole('button', { name: 'Save player' }).click();
    await expect(page.getByRole('heading', { name: 'Edit players' })).toBeVisible();
    await expect(page.getByLabel('Edit players').getByText('QA Extra')).toBeVisible();
    await page.getByRole('button', { name: /Save|Done/ }).click();
    await expect(page.getByRole('heading', { name: 'Manage match' })).toBeVisible();

    await page.locator('button').filter({ hasText: 'Hall of Shame' }).last().click();
    await expect(page.getByRole('heading', { name: 'Hall of Shame' })).toBeVisible();
    await page.getByRole('button', { name: 'Medium Balanced roast.' }).click();
    await expect(page.getByRole('button', { name: 'Medium Balanced roast.' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Back' }).click();

    await page.locator('button').filter({ hasText: 'Regenerate rounds' }).last().click();
    await expect(page.getByRole('heading', { name: 'Regenerate rounds' })).toBeVisible();
    await expect(page.getByText(/Start from round/i).first()).toBeVisible();
  });

  test('host can update active players and link a manual player to a FOM friend', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    await page.getByRole('button', { name: 'Open manage match' }).click();
    await page.getByRole('button', { name: /Players/i }).click();
    await expect(page.getByRole('heading', { name: 'Edit players' })).toBeVisible();

    await page.getByRole('button', { name: 'Sit all' }).click();
    await expect(page.getByText('Keep at least 4 active players to create the next round.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Save|Done/ })).toBeDisabled();
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(page.getByText('Keep at least 4 active players to create the next round.')).toHaveCount(0);

    await page.getByRole('button', { name: 'Deactivate Wildan' }).click();
    await expect(page.getByRole('button', { name: 'Activate Wildan' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('Keep at least 4 active players to create the next round.')).toBeVisible();
    await page.getByRole('button', { name: 'Activate Wildan' }).click();
    await expect(page.getByText('Keep at least 4 active players to create the next round.')).toHaveCount(0);

    await page.getByRole('button', { name: /Add player/i }).click();
    await page.getByPlaceholder('Example: Falih Hermon').fill('QA Manual');
    await page.getByRole('button', { name: 'Save player' }).click();
    await expect(page.getByRole('heading', { name: 'Edit players' })).toBeVisible();
    await expect(page.getByLabel('Edit players').getByText('QA Manual')).toBeVisible();

    await page.getByRole('button', { name: 'Link FOM profile for QA Manual' }).click();
    await expect(page.getByRole('heading', { name: 'Link FOM friend' })).toBeVisible();
    await page.getByRole('button', { name: /Reza FOM/i }).click();
    await expect(page.getByRole('heading', { name: 'Edit players' })).toBeVisible();
    await expect(page.getByLabel('Edit players').getByText('Reza FOM')).toBeVisible();
    await expect(page.getByLabel('Edit players').getByText('QA Manual')).toHaveCount(0);

    await page.getByRole('button', { name: 'Deactivate Wildan' }).click();
    await expect(page.getByRole('button', { name: 'Activate Wildan' })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Manage match' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Players' }).filter({ hasText: '5 total · 4 active' })).toBeVisible();
  });

  test('host can delete generated rounds from a selected round', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    await page.getByRole('button', { name: 'Open manage match' }).click();
    await page.locator('button').filter({ hasText: 'Regenerate rounds' }).last().click();
    await expect(page.getByRole('heading', { name: 'Regenerate rounds' })).toBeVisible();

    await page.getByRole('button', { name: /Start from round 2/i }).click();
    await expect(page.getByText('Delete round 2+?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete rounds' }).click();
    await expect(page.getByRole('heading', { name: 'Manage match' })).toBeVisible();

    const regenerateRow = page.locator('button').filter({ hasText: 'Regenerate rounds' }).last();
    await expect(regenerateRow).toBeDisabled();
    await expect(regenerateRow).toContainText('N/A');
  });

  test('host sees an inline confirmation before deleting the active match', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    await page.getByRole('button', { name: 'Open manage match' }).click();
    await page.getByRole('button', { name: 'Delete match' }).click();
    await expect(page.getByRole('heading', { name: 'Delete match' })).toBeVisible();
    await expect(page.getByText('Delete this match?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete match' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Manage match' })).toBeVisible();
  });

  test('host can toggle Hall of Shame and change toxic intensity while active', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    await page.getByRole('button', { name: 'Open manage match' }).click();
    await page.locator('button').filter({ hasText: 'Hall of Shame' }).last().click();
    await expect(page.getByRole('heading', { name: 'Hall of Shame' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Savage Full Hall of Shame.' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Mild Light banter.' }).click();
    await expect(page.getByRole('button', { name: 'Mild Light banter.' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Disable Hall of Shame' }).click();
    await expect(page.getByText('Turn off Hall of Shame?')).toBeVisible();
    await page.getByRole('button', { name: 'Turn off' }).click();
    await expect(page.getByRole('button', { name: 'Enable Hall of Shame' })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('button').filter({ hasText: 'Hall of Shame' }).filter({ hasText: 'Off' })).toBeVisible();

    await page.locator('button').filter({ hasText: 'Hall of Shame' }).last().click();
    await page.getByRole('button', { name: 'Enable Hall of Shame' }).click();
    await page.getByRole('button', { name: 'Medium Balanced roast.' }).click();
    await expect(page.getByRole('button', { name: 'Medium Balanced roast.' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('button').filter({ hasText: 'Hall of Shame' }).filter({ hasText: 'On · Medium' })).toBeVisible();
  });
});
