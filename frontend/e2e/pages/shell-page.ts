import type { Locator, Page } from '@playwright/test';

const MODAL_BELOW_WIDTH = 840; // below the expanded breakpoint the drawer is modal

/** The app shell: app bar, ⋮ menu, drawer, landmarks and the places where messages appear. */
export class ShellPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get html(): Locator {
    return this.page.locator('html');
  }
  get main(): Locator {
    return this.page.getByRole('main');
  }
  get banner(): Locator {
    return this.page.getByRole('banner');
  }
  /** Any heading level 1, or the one with this name. */
  heading(name?: string | RegExp): Locator {
    return this.page.getByRole('heading', name === undefined ? { level: 1 } : { level: 1, name });
  }
  /** The visible status messages of the page (TS-TEST-24). */
  get status(): Locator {
    return this.page.getByRole('status');
  }
  statusWith(text: string | RegExp): Locator {
    return this.status.filter({ hasText: text });
  }
  get snackbar(): Locator {
    return this.page.locator('app-snackbar-host');
  }
  get closeSnackbarButton(): Locator {
    return this.page.getByRole('button', { name: 'Hinweis schließen' });
  }
  /** The polite live region of the announcer: it has no role, the one allowed CSS locator (TS-TEST-24). */
  get announcement(): Locator {
    return this.page.locator('.cdk-live-announcer-element[aria-live="polite"]');
  }
  get anyDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  // Drawer
  get navigation(): Locator {
    return this.page.getByRole('navigation', { name: 'Hauptnavigation' });
  }
  get menuButton(): Locator {
    return this.page.getByRole('button', { name: 'Navigation öffnen' });
  }
  get closeNavigationButton(): Locator {
    return this.page.getByRole('button', { name: 'Navigation schließen' });
  }
  get drawer(): Locator {
    return this.page.locator('mat-sidenav');
  }
  get drawerBackdrop(): Locator {
    return this.page.locator('.mat-drawer-backdrop');
  }
  get settingsLink(): Locator {
    return this.navigation.getByRole('link', { name: 'Einstellungen' });
  }
  listLink(name: string | RegExp): Locator {
    return this.navigation.getByRole('link', { name });
  }
  get newListButton(): Locator {
    return this.navigation.getByRole('button', { name: 'Neue Liste' });
  }

  // ⋮ menu
  get optionsButton(): Locator {
    return this.page.getByRole('button', { name: 'Weitere Optionen' });
  }
  get optionsMenu(): Locator {
    return this.page.getByRole('menu');
  }
  get menuItems(): Locator {
    return this.page.getByRole('menuitem');
  }
  menuItem(name: string): Locator {
    return this.page.getByRole('menuitem', { name });
  }

  // Offline banner
  get offlineMessage(): Locator {
    return this.banner.getByText('Keine Verbindung. Änderungen sind gerade nicht möglich.');
  }

  /** Opens the drawer where it is modal; the permanent drawer is there already. */
  async openDrawer(): Promise<void> {
    if ((this.page.viewportSize()?.width ?? MODAL_BELOW_WIDTH + 1) < MODAL_BELOW_WIDTH) await this.menuButton.click();
    await this.navigation.waitFor();
  }

  async openOptions(): Promise<void> {
    await this.optionsButton.click();
  }

  /** Opens the ⋮ menu and chooses one command. */
  async chooseOption(name: string): Promise<void> {
    await this.openOptions();
    await this.menuItem(name).click();
  }

  async signOut(): Promise<void> {
    await this.chooseOption('Abmelden');
  }
}
