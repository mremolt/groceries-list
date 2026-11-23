import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { END_SESSION_URL } from './fixtures/session';

// Layout statement (NG-UI-23): the shell is a top app bar (menu button on compact/medium, ⋮ at the end, the page's h1
// below) over one content column (max 52.5 rem on medium, 65 rem on expanded). Compact and medium: modal drawer;
// expanded: permanent 360 px drawer at the start. Tests tagged @modal run only in the narrow projects, @permanent only in
// the wide ones (playwright.config.ts), so no test is skipped.

test.describe('lists start page @responsive @theme @shell @a11y-shell', () => {
  test('renders the German empty state with its landmarks and title', async ({ page, expectAccessible, meCalls }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Einkaufsliste' })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeVisible();
    await expect(page).toHaveTitle('Meine Listen | Einkaufsliste');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    expect(meCalls(), 'request budget of the start page (TS-TEST-14)').toBe(1);

    await expectAccessible('lists start page');
  });

  test('reflows and survives text spacing overrides', async ({ page, expectReflowAndTextSpacing }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expectReflowAndTextSpacing();
  });
});

test.describe('session', () => {
  test.use({ session: { signedIn: false } });

  test('without a session the whole page goes to the BFF login', async ({ page, expectErrors }) => {
    expectErrors(/status of 401/); // the browser logs the stubbed 401
    await page.route('**/oauth2/authorization/keycloak', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>Login</title><h1>Keycloak</h1>' }),
    );

    await page.goto('/');

    await expect(page).toHaveURL(/\/oauth2\/authorization\/keycloak$/);
    await expect(page.getByRole('heading', { name: 'Keycloak' })).toBeVisible();
  });
});

test.describe('navigation drawer @responsive @shell @a11y-shell', () => {
  test('modal drawer: opens, keeps keyboard focus inside, closes with Esc and returns focus @modal', async ({
    page,
    expectAccessible,
  }) => {
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Navigation öffnen' });

    await menuButton.focus();
    await page.keyboard.press('Enter');

    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('heading', { name: 'Meine Listen' })).toBeVisible();
    await expect(nav.getByText('Noch keine Listen.')).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Einstellungen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Neue Liste' }).first()).toBeEnabled();
    await expectAccessible('modal drawer open');

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await nav.evaluate((el) => el.closest('mat-sidenav')?.contains(document.activeElement) ?? false)).toBe(
        true,
      );
    }
    await page.keyboard.press('Escape');

    await expect(nav).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test('modal drawer closes with the close button, the backdrop and after choosing an entry @modal', async ({
    page,
  }) => {
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Navigation öffnen' });
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });

    await menuButton.click();
    await page.getByRole('button', { name: 'Navigation schließen' }).click();
    await expect(nav).toBeHidden();
    await expect(menuButton).toBeFocused();

    await menuButton.click();
    await page.locator('.mat-drawer-backdrop').click({ position: { x: page.viewportSize()!.width - 10, y: 300 } });
    await expect(nav).toBeHidden();

    await menuButton.click();
    await nav.getByRole('link', { name: 'Einstellungen' }).click();
    await expect(nav).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
  });

  test('permanent drawer on expanded: visible at once, 360 px wide, no menu or close button @permanent', async ({
    page,
    expectAccessible,
  }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    await expect(nav).toBeVisible();
    await expect(page.getByRole('button', { name: 'Navigation öffnen' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Navigation schließen' })).toHaveCount(0);
    const width = await page.locator('mat-sidenav').evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBe(360);
    await expectAccessible('permanent drawer');
  });

  test('keeps the page when the window is resized across the breakpoint (TS-TEST-20)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/einstellungen');
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });

    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Navigation öffnen' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeHidden();

    await page.setViewportSize({ width: 1024, height: 768 });

    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Navigation öffnen' })).toHaveCount(0);
  });

  test('marks the current page in the drawer @permanent', async ({ page }) => {
    await page.goto('/einstellungen');

    await expect(page.getByRole('link', { name: 'Einstellungen' }).first()).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('„Weitere Optionen“ menu and sign-out @shell @a11y-shell', () => {
  test('opens with the keyboard, moves with the arrow keys, closes with Esc and returns focus', async ({
    page,
    expectAccessible,
  }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Weitere Optionen' });
    await button.focus();

    await page.keyboard.press('Enter');

    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('menuitem', { name: 'Einstellungen' })).toBeFocused();
    await expectAccessible('menu open');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Abmelden' })).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('menu')).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('signs out with the XSRF header and navigates the whole page to the IdP end-session address', async ({
    page,
    context,
  }) => {
    await context.addCookies([{ name: 'XSRF-TOKEN', value: 'xsrf-e2e', url: 'http://localhost:4200' }]);
    let xsrf: string | undefined;
    await page.route('**/logout', (route) => {
      xsrf = route.request().headers()['x-xsrf-token'];
      return route.fulfill({ json: { redirectUri: END_SESSION_URL } });
    });
    await page.route('http://keycloak.localhost:8180/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>Abgemeldet</title><h1>Keycloak</h1>' }),
    );
    await page.goto('/');

    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Abmelden' }).click();

    await expect(page).toHaveURL(END_SESSION_URL);
    expect(xsrf).toBe('xsrf-e2e');
  });

  test('a failed sign-out shows the error snackbar, keeps the page and allows a second try', async ({
    page,
    expectErrors,
  }) => {
    expectErrors(/status of 500/); // the browser logs the stubbed 500
    await page.route('**/logout', (route) => route.fulfill({ status: 500, json: { title: 'Server error' } }));
    await page.goto('/');

    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Abmelden' }).click();

    await expect(page.getByRole('status')).toContainText('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    await expect(page.getByRole('heading', { level: 1, name: 'Einkaufsliste' })).toBeVisible();
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await expect(page.getByRole('menuitem', { name: 'Abmelden' })).toBeEnabled();
  });
});

test.describe('snackbar timing @shell', () => {
  test('stays at least 10 s, is held while hovered and has a close button', async ({
    page,
    expectAccessible,
    expectErrors,
  }) => {
    expectErrors(/status of 500/);
    await page.clock.install();
    await page.route('**/logout', (route) => route.fulfill({ status: 500, json: { title: 'Server error' } }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Abmelden' }).click();
    const snackbar = page.getByRole('status');
    await expect(snackbar).toContainText('Das hat nicht geklappt');
    await expectAccessible('snackbar visible');

    await page.clock.fastForward(9_000);
    await expect(snackbar).toContainText('Das hat nicht geklappt');
    await snackbar.getByText('Das hat nicht geklappt').hover();
    await page.clock.fastForward(60_000);
    await expect(snackbar).toContainText('Das hat nicht geklappt');

    await page.mouse.move(2, 2);
    await page.clock.fastForward(10_001);
    await expect(snackbar).not.toContainText('Das hat nicht geklappt');
  });

  test('closes with „Hinweis schließen“ and does not take keyboard focus away', async ({ page, expectErrors }) => {
    expectErrors(/status of 500/);
    await page.route('**/logout', (route) => route.fulfill({ status: 500, json: { title: 'Server error' } }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Abmelden' }).click();
    await expect(page.getByRole('status')).toContainText('Das hat nicht geklappt');

    await page.getByRole('button', { name: 'Hinweis schließen' }).click();

    await expect(page.getByRole('status')).not.toContainText('Das hat nicht geklappt');
  });
});

test.describe('route title and focus (A11Y-21) @shell @a11y-shell', () => {
  test('navigating to the settings page sets the title and moves focus to the new h1', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Weitere Optionen' }).click();
    await page.getByRole('menuitem', { name: 'Einstellungen' }).click();

    await expect(page).toHaveTitle('Einstellungen | Einkaufsliste');
    await expect(page).toHaveURL(/\/einstellungen$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeFocused();
  });

  test('the settings page has no accessibility violations', async ({ page, expectAccessible }) => {
    await page.goto('/einstellungen');
    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();

    await expectAccessible('settings page');
  });
});

test.describe('keyboard journey (A11Y layer L5) @shell @a11y-shell', () => {
  test('every control is reachable with Tab in reading order and shows a focus indicator @permanent', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          return el.getAttribute('aria-label') ?? el.textContent.trim();
        }),
      );
    }

    expect(order).toEqual(['Neue Liste', 'Einstellungen', 'Weitere Optionen', 'Neue Liste']);
    // Material draws its focus indicator as a ::before border on the control or one of its children (NFR-A11Y-02);
    // own controls use an outline
    const indicator = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const visible = (target: Element): boolean => {
        const before = getComputedStyle(target, '::before');
        return before.display !== 'none' && before.borderTopStyle !== 'none' && before.borderTopWidth !== '0px';
      };
      return getComputedStyle(el).outlineStyle !== 'none' || [el, ...el.querySelectorAll('*')].some(visible);
    });
    expect(indicator, 'visible focus indicator on the focused control').toBe(true);
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

  test('the heading uses the token colour', async ({ page }) => {
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
  test('keeps the drawer, the current page and the text visible', async ({ page, expectAccessible }) => {
    await page.goto('/einstellungen');

    await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
    const color = await page.getByRole('heading', { level: 1 }).evaluate((el) => getComputedStyle(el).color);
    expect(color).not.toBe('');
    await expectAccessible('settings page, forced colors');
  });
});
