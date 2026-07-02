import { expect, test } from '@playwright/test';

const countDirectTopHighlights = async (summary: import('@playwright/test').Locator) => (
  summary.evaluate((element) => (
    Array.from(element.children).filter((child) => {
      const classes = Array.from(child.classList);
      return (
        classes.includes('pointer-events-none') &&
        classes.includes('absolute') &&
        classes.includes('inset-x-0') &&
        classes.includes('top-0') &&
        classes.includes('h-px') &&
        classes.includes('bg-white/55')
      );
    }).length
  ))
);

const getTimerClassList = async (summary: import('@playwright/test').Locator) => (
  summary.evaluate((element) => {
    const timer = Array.from(element.querySelectorAll('span')).find((span) => (
      /^\d{2}:\d{2}(?::\d{2})?$/.test((span.textContent || '').trim())
    ));
    return timer ? Array.from(timer.classList) : [];
  })
);

test.describe('Share Card Style', () => {
  test('standings share card uses dark editorial background with translucent summary', async ({ page }) => {
    await page.goto('/app?e2e=standings-6p');

    await expect(page.getByText('Standings').first()).toBeVisible();

    const storyCanvas = page.locator('[aria-hidden="true"] > div').first();
    const storySummary = page.locator('[aria-hidden="true"] section').first();
    const storyStat = storySummary.locator('div.grid > div').first();

    await expect(storyCanvas.locator(':scope > div').first()).toHaveClass(/bg-\[#07111f\]/);
    await expect(storySummary).toHaveClass(/backdrop-blur-md/);
    await expect(storySummary).toHaveClass(/bg-white\/10/);
    await expect(storyStat).toHaveClass(/bg-white\/18/);

    const styles = await Promise.all([
      storySummary.evaluate((element) => window.getComputedStyle(element).backdropFilter),
      storySummary.evaluate((element) => window.getComputedStyle(element).clipPath),
    ]);

    expect(styles[0]).toContain('blur');
    expect(styles[1]).toContain('inset');
  });

  test('share card logo keeps fixed header size and spacing', async ({ page }) => {
    await page.goto('/app?e2e=standings-6p');
    await expect(page.getByText('Standings').first()).toBeVisible();

    const storyShell = page.locator('[aria-hidden="true"] > div > div').first();
    const storyLogoHeader = page.locator('[aria-hidden="true"] header').first();
    const storyLogo = storyLogoHeader.locator('img').first();
    const storySummary = page.locator('[aria-hidden="true"] section').first();

    const [shellBox, logoHeaderBox, logoBox, summaryBox] = await Promise.all([
      storyShell.boundingBox(),
      storyLogoHeader.boundingBox(),
      storyLogo.boundingBox(),
      storySummary.boundingBox(),
    ]);

    expect(shellBox).not.toBeNull();
    expect(logoHeaderBox).not.toBeNull();
    expect(logoBox).not.toBeNull();
    expect(summaryBox).not.toBeNull();

    const topGap = logoHeaderBox!.y - shellBox!.y;
    const bottomGap = summaryBox!.y - (logoHeaderBox!.y + logoHeaderBox!.height);

    expect(Math.abs(logoBox!.height - 26)).toBeLessThanOrEqual(1);
    expect(Math.abs(logoHeaderBox!.height - 40)).toBeLessThanOrEqual(1);
    expect(Math.abs(topGap - 12)).toBeLessThanOrEqual(1);
    expect(Math.abs(bottomGap - 12)).toBeLessThanOrEqual(1);
  });

  test('share card summary outline stays clean without extra top highlights', async ({ page }) => {
    await page.goto('/app?e2e=standings-6p');
    await expect(page.getByText('Standings').first()).toBeVisible();

    const storySummary = page.locator('[aria-hidden="true"] section').first();

    await expect(storySummary).toHaveClass(/border-white\/42/);
    expect(await countDirectTopHighlights(storySummary)).toBe(0);
  });

  test('share card timer is text-only without a chip', async ({ page }) => {
    await page.goto('/app?e2e=standings-6p');
    await expect(page.getByText('Standings').first()).toBeVisible();

    const storySummary = page.locator('[aria-hidden="true"] section').first();
    const storyTimerClasses = await getTimerClassList(storySummary);

    expect(storyTimerClasses).toEqual(expect.arrayContaining(['tabular-nums', 'text-white/95']));
    expect(storyTimerClasses).not.toEqual(expect.arrayContaining(['rounded-full']));
    expect(storyTimerClasses).not.toEqual(expect.arrayContaining(['border']));
    expect(storyTimerClasses).not.toEqual(expect.arrayContaining(['bg-black/18']));
  });

  test('shared standings keeps viewer notice before the standings summary', async ({ page }) => {
    await page.goto('/app?e2e=shared-viewer-flow&view=klasemen');
    const notice = page.getByText('This page is read-only.');
    await expect(notice).toBeVisible();
    await expect(page.locator('.standings-header-logo').first()).toBeVisible();

    const standingsSummary = page.locator('main section h2').first().locator('xpath=ancestor::section[1]');
    const [noticeBox, summaryBox] = await Promise.all([
      notice.boundingBox(),
      standingsSummary.boundingBox(),
    ]);

    expect(noticeBox).not.toBeNull();
    expect(summaryBox).not.toBeNull();
    expect(summaryBox!.y).toBeGreaterThanOrEqual(noticeBox!.y + noticeBox!.height);
  });
});
