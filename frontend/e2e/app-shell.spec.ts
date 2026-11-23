import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

// Layout statement (NG-UI-23): the M0 start page is one column at every size class: a top bar with the app name and a
// content area (max 65 rem, centred) holding one card. Navigation arrives with M1.

test.describe('start page @responsive @theme @shell', () => {
  test('renders the German start page with its landmarks and title', async ({ page, expectAccessible }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Einkaufsliste' })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Willkommen' })).toBeVisible();
    await expect(page).toHaveTitle('Start | Einkaufsliste');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    await expectAccessible('start page');
  });

  test('reflows and survives text spacing overrides', async ({ page, expectReflowAndTextSpacing }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expectReflowAndTextSpacing();
  });

  test('makes no API call while the start page loads', async ({ page, apiCalls }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(apiCalls.length, 'start page request budget').toBeLessThanOrEqual(0);
  });
});

test.describe('theme', () => {
  const rgb = (hex: string): string => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${String((n >> 16) & 255)}, ${String((n >> 8) & 255)}, ${String(n & 255)})`;
  };
  const pageBackground = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  test('System follows prefers-color-scheme and switches live', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', contrast: 'no-preference' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await pageBackground(page)).toBe(rgb('#EDEDF4')); // design-tokens.json color.light.pageBg

    await page.emulateMedia({ colorScheme: 'dark' });

    await expect.poll(() => pageBackground(page)).toBe(rgb('#111318')); // color.dark.pageBg
  });

  test('a stored per-device choice wins over the system setting', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', contrast: 'no-preference' });
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');
    expect(await pageBackground(page)).toBe(rgb('#111318'));
  });

  test('the card and text use the token colours', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', contrast: 'no-preference' });
    await page.goto('/');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    expect(await heading.evaluate((el) => getComputedStyle(el).color)).toBe(rgb('#191C20')); // onSurface
  });
});

test.describe('start-up failure', () => {
  test('an invalid config.json shows the static start-up message', async ({ page, expectErrors }) => {
    expectErrors(/Bootstrap failed/); // main.ts logs the failed bootstrap (NG-CFG-03)
    await page.route('**/config.json', (route) => route.fulfill({ json: { environment: '' } }));

    await page.goto('/');

    await expect(page.getByRole('alert')).toContainText('konnte nicht gestartet werden');
  });
});

test.describe('forced colors @shell', () => {
  test('keeps the card boundary and text visible', async ({ page, expectAccessible }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Einkaufsliste' })).toBeVisible();
    const color = await page.getByRole('heading', { level: 1 }).evaluate((el) => getComputedStyle(el).color);
    expect(color).not.toBe('');
    await expectAccessible('start page, forced colors');
  });
});
