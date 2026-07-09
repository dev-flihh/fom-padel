import { expect, test } from '@playwright/test';

// Fitur PRD Match Creation v2: unified player search (guest add inline),
// save-as-template di Review, quick start template & repeat last match (A4).
test.describe('Match Creation v2', () => {
  test('players step adds a guest straight from search', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Add players.' })).toBeVisible();
    await expect(page.getByText('In this match · 5 players')).toBeVisible();

    await page.getByRole('textbox', { name: 'Search players' }).fill('Guest Joe');
    await page.getByRole('button', { name: /as guest/i }).click();

    await expect(page.getByText('In this match · 6 players')).toBeVisible();
    await expect(page.getByText('Guest Joe')).toBeVisible();
    await expect(page.getByText('guest', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Remove Guest Joe' }).click();
    await expect(page.getByText('In this match · 5 players')).toBeVisible();
  });

  test('review saves a template and quick start reuses it', async ({ page }) => {
    await page.goto('/app?e2e=background-flow');

    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Review setup.' })).toBeVisible();

    await page.getByRole('button', { name: 'Save as template' }).click();
    await page.getByRole('textbox', { name: 'Template name' }).fill('Friday Crew E2E');
    await page.getByRole('button', { name: 'Generate Match' }).click();
    await expect(page.getByText(/Round 1/i).first()).toBeVisible();

    // Boot ulang scenario yang sama — template tersimpan di localStorage akun.
    await page.goto('/app?e2e=background-flow');
    await expect(page.getByRole('heading', { name: 'Name your match.' })).toBeVisible();
    await page.getByRole('button', { name: 'Start from a template' }).click();
    await page.getByRole('button', { name: /^Friday Crew E2E/ }).click();

    // Quick start autofill semua step tapi TETAP di Step 1 — user memeriksa
    // sendiri isiannya (feedback v2.1).
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await expect(page.getByLabel('Venue')).toHaveValue('E2E Court');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('In this match · 5 players')).toBeVisible();
  });

  test('repeat last match banner prefills the draft from history', async ({ page }) => {
    await page.goto('/app?e2e=finished-flow');

    await page.getByRole('button', { name: 'Back to history' }).click();
    await expect(page.getByText('Welcome back')).toBeVisible();
    await page.getByText('Start Match').click();

    await expect(page.getByRole('heading', { name: 'Name your match.' })).toBeVisible();
    await expect(page.getByText('Repeat last match?')).toBeVisible();
    await expect(page.getByText('Match Play · 4 courts · 16 players')).toBeVisible();
    await page.getByRole('button', { name: 'Use', exact: true }).click();

    // Autofill diterapkan, tetap di Step 1 dengan venue terisi dari history.
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await expect(page.getByLabel('Venue')).toHaveValue('FOM Test Court');

    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('In this match · 17 players')).toBeVisible();
  });
});
