import { expect, test } from '@playwright/test';

const setVisibleScore = async (
  page: import('@playwright/test').Page,
  teamA: string,
  teamB: string
) => {
  const scores = page.getByRole('textbox', { name: /^Score for / });
  await expect(scores).toHaveCount(2);
  await scores.first().fill(teamA);
  await scores.nth(1).fill(teamB);
  await expect(scores.first()).toHaveValue(teamA);
  await expect(scores.nth(1)).toHaveValue(teamB);
};

test.describe('Active Match Finish Flow', () => {
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

  test('host can score active rounds, finish the match, and open standings', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    await expect(page.getByRole('heading', { name: 'E2E Toxic Ticker' })).toBeVisible();
    await expect(page.getByText('Round 2 of 3')).toBeVisible();

    await setVisibleScore(page, '6', '0');
    await expect(page.getByRole('button', { name: 'Next Round' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next Round' }).click();

    await expect(page.getByText('Round 3 of 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finish Match' })).toBeDisabled();

    await setVisibleScore(page, '1', '5');
    await expect(page.getByRole('button', { name: 'Finish Match' })).toBeEnabled();
    await page.getByRole('button', { name: 'Finish Match' }).click();
    const finishDialog = page.getByRole('dialog', { name: 'Finish match confirmation' });
    await expect(finishDialog).toBeVisible();
    await expect(finishDialog.getByText('Official standings lock in')).toBeVisible();
    await expect(finishDialog.getByText(/Hall of Shame locks as Savage/i)).toBeVisible();
    const closeFinishButton = finishDialog.getByRole('button', { name: 'Close finish confirmation' });
    const cancelFinishButton = finishDialog.getByRole('button', { name: 'Not yet' });
    const saveFinalButton = finishDialog.getByRole('button', { name: 'Save final results' });
    await expect(closeFinishButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cancelFinishButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(saveFinalButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeFinishButton).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(finishDialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Finish Match' })).toBeFocused();
    await page.getByRole('button', { name: 'Finish Match' }).click();
    await expect(finishDialog).toBeVisible();
    await finishDialog.getByRole('button', { name: 'Not yet' }).click();
    await expect(finishDialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Finish Match' })).toBeFocused();
    await page.getByRole('button', { name: 'Finish Match' }).click();
    await expect(finishDialog).toBeVisible();
    await finishDialog.getByRole('button', { name: 'Save final results' }).click();

    await expect(page.getByText('Results are ready')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Standings' })).toBeVisible();
    await page.getByRole('button', { name: 'Share match' }).last().click();
    await expect(page.getByText('Copied Link')).toBeVisible();

    const copiedTexts = await page.evaluate(() => (window as any).__copiedTexts as string[]);
    const lastCopiedText = copiedTexts[copiedTexts.length - 1] || '';
    expect(lastCopiedText).toContain('/app?shared=e2eshare');
    expect(lastCopiedText).not.toContain('view=klasemen');

    await page.getByRole('button', { name: 'Open manage match' }).click();
    await expect(page.getByRole('heading', { name: 'Manage match' })).toBeVisible();
    await page.locator('button').filter({ hasText: 'Hall of Shame' }).last().click();
    await expect(page.getByRole('heading', { name: 'Hall of Shame' })).toBeVisible();
    await expect(page.getByText('Finished matches keep the Hall of Shame setting locked.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disable Hall of Shame' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Medium Balanced roast.' })).toBeDisabled();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Manage match' })).toBeVisible();
    await page.getByRole('button', { name: 'Close manage match' }).click();

    await page.getByRole('button', { name: 'View Standings' }).click();

    // FR-4.5: first Klasemen open after finishing auto-prompts the Rewind upload.
    await expect(page.getByText('Every mabar deserves')).toBeVisible();
    await page.getByRole('button', { name: 'Tutup FOM Rewind' }).click();

    await expect(page.getByRole('heading', { name: 'E2E Toxic Ticker' })).toBeVisible();
    await expect(page.getByText('Official').first()).toBeVisible();
    await expect(page.getByText('Hall of Shame').first()).toBeVisible();
    await expect(page.getByText('3/3').first()).toBeVisible();
  });

  test('Americano incomplete round uses an in-app confirmation sheet', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      throw new Error(`Unexpected browser dialog: ${dialog.message()}`);
    });

    await page.goto('/app?e2e=americano-incomplete-round');

    await expect(page.getByRole('heading', { name: 'E2E Americano Guard' })).toBeVisible();
    await expect(page.getByText('3/6 points entered').first()).toBeVisible();
    await expect(page.getByText('Needs 3 pts').first()).toBeVisible();

    await page.getByRole('button', { name: 'Complete Round 1' }).click();
    const incompleteDialog = page.getByRole('dialog', { name: 'Complete round with incomplete scores' });
    await expect(incompleteDialog).toBeVisible();
    await expect(incompleteDialog.getByText('Court 1 still has incomplete scores.')).toBeVisible();
    await expect(incompleteDialog.getByText('3/6 points entered')).toBeVisible();
    await expect(incompleteDialog.getByText('3 points left before this round is fully ready.')).toBeVisible();
    await expect(incompleteDialog.getByRole('button', { name: 'Close incomplete score confirmation' })).toBeFocused();

    await incompleteDialog.getByRole('button', { name: 'Review scores' }).click();
    await expect(incompleteDialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Complete Round 1' })).toBeFocused();

    await page.getByRole('button', { name: 'Complete Round 1' }).click();
    await expect(incompleteDialog).toBeVisible();
    await incompleteDialog.getByRole('button', { name: 'Complete anyway' }).click();

    await expect(page.getByRole('button', { name: 'Round Completed' })).toBeDisabled();
    await expect(page.getByText('Completed').first()).toBeVisible();
  });
});
