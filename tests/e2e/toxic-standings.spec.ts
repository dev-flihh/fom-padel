import { expect, test } from '@playwright/test';

test.describe('Toxic Standings', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('fom_toxic_copy_config_v1');
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

    await expect(page.getByText('Standings').first()).toBeVisible();
    await expect(page.getByText('Hall of Shame')).toHaveCount(0);
    await expect(page.getByText(/King of Cupu/i)).toHaveCount(0);
  });

  test('official standings marks the logged-in player without crowding the row', async ({ page }) => {
    await page.goto('/app?e2e=standings-6p');

    await expect(page.getByText('You', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Expand Falih Harman round/i })).toBeVisible();
    await expect(page.getByText('Ranked W > Diff > Pts')).toBeVisible();
    await expect(page.getByText('Pts/Diff').first()).toBeVisible();

    const myRankShortcut = page.getByRole('button', { name: /Jump to Your rank #/i });
    await expect(myRankShortcut).toBeVisible();
    await expect(myRankShortcut).toContainText('Your rank');
    await myRankShortcut.click();

    const expandedPlayerTrigger = page.getByRole('button', { name: /Collapse Falih Harman round history/i });
    await expect(expandedPlayerTrigger).toBeVisible();
    const expandedPlayerDetailId = await expandedPlayerTrigger.getAttribute('aria-controls');
    expect(expandedPlayerDetailId).toBeTruthy();
    await expect(page.locator(`#${expandedPlayerDetailId}`)).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('official champion strip expands to show round history', async ({ page }) => {
    await page.goto('/app?e2e=standings-6p');

    const championTrigger = page.getByRole('button', { name: /Expand Ari Putra round history/i });
    await expect(championTrigger).toBeVisible();
    await expect(championTrigger).toHaveAccessibleName(/Rank 1, .*points, diff/i);
    const championDetailId = await championTrigger.getAttribute('aria-controls');
    expect(championDetailId).toBeTruthy();
    await championTrigger.click();

    await expect(page.locator(`#${championDetailId}`)).toBeVisible();
    await expect(page.locator(`#${championDetailId}`)).toHaveAttribute('role', 'region');
    await expect(page.getByText('Round history')).toBeVisible();
    await expect(page.getByText('Last 2')).toBeVisible();
    await expect(page.getByText('C1').first()).toBeVisible();
    await expect(page.getByText('w/ Bimo vs Falih & Dino')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('official long round history starts compact and can expand all rounds', async ({ page }) => {
    await page.goto('/app?e2e=standings-long-history');

    const playerTrigger = page.getByRole('button', { name: /Expand Falih Harman round history/i });
    await expect(playerTrigger).toBeVisible();
    await expect(playerTrigger).toHaveAccessibleName(/Rank \d+, .*points, diff/i);
    const playerDetailId = await playerTrigger.getAttribute('aria-controls');
    expect(playerDetailId).toBeTruthy();
    await playerTrigger.click();

    await expect(page.locator(`#${playerDetailId}`)).toBeVisible();
    await expect(page.locator(`#${playerDetailId}`)).toHaveAttribute('role', 'region');
    await expect(page.getByText('Round history')).toBeVisible();
    await expect(page.getByText('Last 3')).toBeVisible();
    await expect(page.getByText('w/ Ari vs Kevin & Rifqi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show all 5 rounds' })).toBeVisible();

    await page.getByRole('button', { name: 'Show all 5 rounds' }).click();

    await expect(page.getByText('All 5')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show latest 3 rounds' })).toBeVisible();
    await expect(page.getByText('w/ Ari vs Nanda & Reza')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('toxic mode opens Hall of Shame by default and can switch back', async ({ page }) => {
    await page.goto('/app?e2e=toxic-standings');

    await expect(page.getByText('Final Hall of Shame').first()).toBeVisible();
    await expect(page.getByText(/The Cupu D.Or Final 2026/)).toBeVisible();
    await expect(page.getByText('OFFICIAL UPSIDE DOWN').first()).toBeVisible();
    await expect(page.getByText('Savage').first()).toBeVisible();
    await expect(page.getByText(/King of Cupu/i).first()).toBeVisible();
    await expect(page.getByText(/Kalah terbesar 0-6 vs Falih & Endo/i).first()).toBeVisible();
    await expect(page.getByText(/Takhta bawah valid/i)).toBeVisible();
    await expect(page.getByText(/3 PTS · -15/i)).toBeVisible();
    await expect(page.getByText(/Nyalip takhta dari pinggir/i)).toBeVisible();
    await expect(page.getByText(/Masih bau zona cupu/i).first()).toBeVisible();
    await expect(page.getByText(/Amunisi Grup WA/i)).toBeVisible();
    await expect(page.getByText(/Lihat evidence/i).first()).toBeVisible();
    await expect(page.getByText(/5 Award/i)).toBeVisible();
    await expect(page.getByText('Duo Petaka')).toBeVisible();
    await expect(page.getByText(/2x main bareng/i)).toBeVisible();
    const airlanggaRow = page.getByRole('button', { name: /Expand Airlangga Sundawa shame evidence/i });
    await expect(airlanggaRow).toBeVisible();
    const airlanggaDetailId = await airlanggaRow.getAttribute('aria-controls');
    expect(airlanggaDetailId).toBeTruthy();
    await airlanggaRow.click();
    await expect(page.locator(`#${airlanggaDetailId}`).getByText(/2x bareng Sonya, DIFF -10/i)).toBeVisible();
    const kingRow = page.getByRole('button', { name: /Expand Sonya Vera shame evidence/i });
    await expect(kingRow).toBeVisible();
    await expect(kingRow).toHaveAccessibleName(/Toxic rank 1, normal rank \d+, .*diff minus 15/i);
    const kingDetailId = await kingRow.getAttribute('aria-controls');
    expect(kingDetailId).toBeTruthy();
    await kingRow.click();
    await expect(page.locator(`#${kingDetailId}`)).toBeVisible();
    await expect(page.locator(`#${kingDetailId}`)).toHaveAttribute('role', 'region');
    await expect(page.locator(`#${kingDetailId}`).getByText('Why am I here?')).toBeVisible();
    await expect(page.locator(`#${kingDetailId}`).getByText(/Toxic rank #1/i)).toBeVisible();
    await expect(page.locator(`#${kingDetailId}`).getByText(/Record 0W-3L/i)).toBeVisible();
    await expect(page.locator(`#${kingDetailId}`).getByText(/Kalah terbesar 0-6 vs Falih & Endo/i)).toBeVisible();
    await expect(page.locator(`#${kingDetailId}`).getByText('Evidence timeline')).toBeVisible();
    await expect(page.locator(`#${kingDetailId}`).getByText('Kalah 0-6')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share match link', exact: true })).toBeVisible();

    await page.getByLabel('Standings', { exact: true }).click();
    await expect(page.getByText('Standings').first()).toBeVisible();

    await page.getByRole('button', { name: /Hall of Shame/i }).click();
    await expect(page.getByText(/All roasts are about this match only/i)).toBeVisible();
  });

  test('official and shame switcher supports keyboard navigation', async ({ page }) => {
    await page.goto('/app?e2e=toxic-standings');

    const switcher = page.getByRole('group', { name: 'Standings view' });
    const officialTab = switcher.getByRole('button', { name: 'Standings', exact: true });
    const shameTab = switcher.getByRole('button', { name: 'Hall of Shame', exact: true });

    await expect(officialTab).toHaveAttribute('aria-controls', 'standings-panel-official');
    await expect(shameTab).toHaveAttribute('aria-controls', 'standings-panel-toxic');
    await expect(page.locator('#standings-panel-toxic')).toBeVisible();
    await expect(shameTab).toHaveAttribute('aria-pressed', 'true');
    await expect(officialTab).toHaveAttribute('aria-pressed', 'false');

    await shameTab.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(officialTab).toBeFocused();
    await expect(officialTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#standings-panel-official')).toBeVisible();
    await expect(page.locator('#standings-panel-official').getByText('Final standings')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(shameTab).toBeFocused();
    await expect(shameTab).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#standings-panel-toxic')).toBeVisible();
    await expect(page.getByText(/All roasts are about this match only/i)).toBeVisible();

    await page.keyboard.press('Home');
    await expect(officialTab).toBeFocused();
    await expect(officialTab).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('End');
    await expect(shameTab).toBeFocused();
    await expect(shameTab).toHaveAttribute('aria-pressed', 'true');
  });

  test('official standings expanded row stays readable and within viewport', async ({ page }) => {
    await page.goto('/app?e2e=toxic-standings');

    await page.getByLabel('Standings', { exact: true }).click();
    await expect(page.getByRole('button', { name: /Expand Fadhil round history/i })).toBeVisible();
    await page.getByRole('button', { name: /Expand Fadhil round history/i }).click();

    const fadhilDetailId = await page.getByRole('button', { name: /Collapse Fadhil round history/i }).getAttribute('aria-controls');
    expect(fadhilDetailId).toBeTruthy();
    const fadhilDetail = page.locator(`#${fadhilDetailId}`);
    await expect(fadhilDetail.getByText('Round history')).toBeVisible();
    await expect(fadhilDetail.getByText('Last 3')).toBeVisible();
    await expect(fadhilDetail.getByText('R3', { exact: true })).toBeVisible();
    await expect(fadhilDetail.getByText('C2').first()).toBeVisible();
    await expect(fadhilDetail.getByText('w/ Baban vs Ariel & Valerievk')).toBeVisible();
    await expect(fadhilDetail.getByText('Match read')).toBeVisible();
    await expect(fadhilDetail.getByText('W W W')).toBeVisible();
    await expect(fadhilDetail.getByText('+5')).toBeVisible();
    await expect(fadhilDetail.getByText('No loss yet')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('official standings empty state stays clear before scores exist', async ({ page }) => {
    await page.goto('/app?e2e=toxic-empty');

    await page.getByLabel('Standings', { exact: true }).click();

    await expect(page.getByText('Standings pending')).toBeVisible();
    await expect(page.getByText('Score one game to start the official table.')).toBeVisible();
    await expect(page.getByText('Score dulu, standings menyusul.')).toBeVisible();
    await expect(page.getByText(/W\/L\/D\/M, points, dan diff/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share match link', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share Standings', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Share options')).toHaveCount(0);
    await expect(page.locator('[data-share-exporter="true"]')).toHaveCount(0);

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('official live standings mark rows with active score progress', async ({ page }) => {
    await page.goto('/app?e2e=toxic-active-ticker');

    await page.getByRole('button', { name: 'Standings', exact: true }).click();
    const standingTicker = page.locator('.toxic-ticker[role="status"]');
    await expect(standingTicker).toBeVisible();
    await expect(standingTicker).toHaveAttribute('aria-live', 'polite');
    await expect(standingTicker).toHaveAttribute('aria-atomic', 'true');
    await expect(standingTicker).toHaveAttribute('aria-label', /Live Shame\..*Evidence:/i);
    await expect(page.getByText('Stuck').first()).toBeVisible();
    await page.getByLabel('Standings', { exact: true }).click();

    await expect(page.getByText('Live standings')).toBeVisible();
    await expect(page.getByText('Points move live; W/L locks after games finish.')).toBeVisible();
    await expect(page.getByText('Live score').first()).toBeVisible();
    await expect(page.getByText('Stuck').first()).toBeVisible();
    await expect(page.getByText('Ranked W > Diff > Pts')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('toxic empty state appears before score progress', async ({ page }) => {
    await page.goto('/app?e2e=toxic-empty');

    const main = page.locator('main');
    await expect(main.getByText('Masih observasi.')).toBeVisible();
    await expect(main.getByText(/Belum ada korban yang layak dinobatkan/i)).toBeVisible();
    await expect(main.getByText('Skor dulu')).toBeVisible();
    await expect(main.getByText('Ticker hidup')).toBeVisible();
    await expect(main.getByText('Award nanti')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share match link', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share the Shame' })).toHaveCount(0);
    await expect(page.getByText(/King of Cupu/i)).toHaveCount(0);
  });

  test('last-place tie becomes Co-King of Cupu without early Duo Petaka award', async ({ page }) => {
    await page.goto('/app?e2e=toxic-co-king');

    const hero = page.locator('[data-toxic-hero-layout="duo"]');
    await expect(hero).toBeVisible();
    await expect(hero.locator('.toxic-hero-player-reveal')).toHaveCount(2);
    const hasOverflowingHeroName = await hero.locator('.toxic-name-reveal').evaluateAll((nodes) => (
      nodes.some((node) => node.scrollWidth > node.clientWidth + 1)
    ));
    expect(hasOverflowingHeroName).toBe(false);
    await expect(page.getByText(/Co-King of Cupu/i).first()).toBeVisible();
    await expect(page.getByText(/Seri cupu/i).first()).toBeVisible();
    await expect(page.getByText('Aditya Avif Chan').first()).toBeVisible();
    await expect(page.getByText('Ariel').first()).toBeVisible();
    await expect(page.getByText('Duo Petaka')).toHaveCount(0);
  });

  test('toxic copy can be overridden from config JSON', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('fom_toxic_copy_config_v1', JSON.stringify({
        version: 99,
        sortLabel: 'CONFIG SORT LABEL',
        awards: {
          'king-of-cupu': { label: 'Config Cupu' },
        },
        heroRoasts: {
          savage: ['Remote hero roast active.'],
        },
        rowRoasts: {
          savage: {
            'last-place': ['Remote row roast active.'],
          },
        },
      }));
    });

    await page.goto('/app?e2e=toxic-standings');

    await expect(page.getByText('CONFIG SORT LABEL').first()).toBeVisible();
    await expect(page.getByText(/Config Cupu/i).first()).toBeVisible();
    await expect(page.getByText(/Remote hero roast active/i)).toBeVisible();
    const remoteRow = page.getByRole('button', { name: /Expand Sonya Vera shame evidence/i });
    const remoteDetailId = await remoteRow.getAttribute('aria-controls');
    expect(remoteDetailId).toBeTruthy();
    await remoteRow.click();
    await expect(page.locator(`#${remoteDetailId}`).getByText(/Remote row roast active/i)).toBeVisible();
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

    await page.getByRole('button', { name: 'Share match link', exact: true }).click();
    await expect(page.getByText('Copied Link')).toBeVisible();

    const copiedTexts = await page.evaluate(() => (window as any).__copiedTexts as string[]);
    const lastCopiedText = copiedTexts[copiedTexts.length - 1] || '';
    expect(lastCopiedText).toContain('/app?e2e=toxic-shared');
    expect(lastCopiedText).toContain('view=klasemen');
    expect(lastCopiedText).not.toContain('view=toxic');
  });

  test('share cards moved to FOM Rewind — card menus are gone', async ({ page }) => {
    await page.goto('/app?e2e=toxic-standings');

    await expect(page.getByRole('button', { name: 'Share match link' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share options' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Get My Match Card' })).toHaveCount(0);
    await expect(page.locator('[data-share-exporter="true"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Bikin FOM Rewind' })).toBeVisible();
  });

  test('award card scrolls to the player evidence in the Full Shame Table', async ({ page }) => {
    await page.goto('/app?e2e=toxic-standings');

    await page.getByRole('button', { name: /Lihat Duo Petaka di Full Shame Table/i }).click();

    await expect(page.getByRole('region', { name: /shame evidence/i }).first()).toBeVisible();
    await expect(page.getByText('Why am I here?').first()).toBeVisible();
  });
});
