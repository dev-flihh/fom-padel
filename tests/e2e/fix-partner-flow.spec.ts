import { expect, test } from '@playwright/test';

test.describe('Fix Partner Flow', () => {
  test('host can build fixed teams, play rounds with locked pairs, and see team standings', async ({ page }) => {
    await page.goto('/app?e2e=start-match-flow');

    await expect(page.getByText('Welcome back')).toBeVisible();
    await page.getByText('Start Match').click();

    // Step 1: match info
    await expect(page.getByRole('heading', { name: 'Name your match.' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: format — switch partner mode to Fix Partner
    await expect(page.getByRole('heading', { name: 'Choose a format' })).toBeVisible();
    await page.getByRole('button', { name: 'Fix Partner', exact: true }).click();
    await expect(page.getByText('You set the pairs once and they stay together all session.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: players — 5 players (odd) must be blocked with a clear reason
    await expect(page.getByText('Fixed teams')).toBeVisible();
    await expect(page.getByText('1 player without a team')).toBeVisible();
    await expect(
      page.getByText('Fix Partner needs an even number of players', { exact: false }).first()
    ).toBeVisible();

    // Tap-to-swap: move the unpaired BG Player 4 into team 1, benching BG Player 1
    await page.getByRole('button', { name: 'Swap BG Player 4' }).click();
    await page.getByRole('button', { name: 'Swap BG Player 1' }).click();
    await expect(page.getByRole('button', { name: 'Swap BG Player 4' })).toBeVisible();

    // Remove the now-unpaired player to make the roster even
    await page.getByRole('button', { name: 'Remove BG Player 1' }).click();
    await expect(page.getByText('player without a team')).toHaveCount(0);
    await expect(page.getByText('4 players ready.').first()).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 4: appearance
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 5: review shows the partner summary row
    await expect(page.getByRole('heading', { name: 'Review setup.' })).toBeVisible();
    await expect(page.getByText('Fix Partner · 2 teams')).toBeVisible();
    await page.getByRole('button', { name: 'Generate Match' }).click();

    const backgroundHeading = page.getByRole('heading', { name: 'Select Background' });
    if (await backgroundHeading.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Skip (Random)' }).click();
    }

    // Round 1 uses the fixed pairs
    await expect(page.getByText(/Round 1/i).first()).toBeVisible();
    const teamAScore = page.getByRole('textbox', { name: 'Score for E2E User and BG Player 4 on court 1' });
    const teamBScore = page.getByRole('textbox', { name: 'Score for BG Player 2 and BG Player 3 on court 1' });
    await expect(teamAScore).toBeVisible();
    await expect(teamBScore).toBeVisible();

    // Score the match to the 21-point target, then advance
    await teamAScore.fill('13');
    await teamBScore.fill('8');
    await page.getByRole('button', { name: 'Next Round' }).click();

    // Round 2: pairs stay locked — same two teams meet again (only 2 teams exist)
    await expect(page.getByText(/Round 2/i).first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Score for E2E User and BG Player 4 on court \d/ })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Score for BG Player 2 and BG Player 3 on court \d/ })).toBeVisible();

    // Standings tab shows team rows with the current user's team shortcut
    await page.getByRole('button', { name: 'Standings', exact: true }).click();
    await expect(page.getByText('Your team rank', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('E2E User & BG Player 4').first()).toBeVisible();
    await expect(page.getByText('BG Player 2 & BG Player 3').first()).toBeVisible();
  });
});
