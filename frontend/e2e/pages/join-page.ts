import type { Locator, Page } from '@playwright/test';

/** The join page `/j/:token`, with and without a session. */
export class JoinPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Liste beitreten' });
  }
  get createAccountAndJoinButton(): Locator {
    return this.page.getByRole('button', { name: 'Konto erstellen und beitreten' });
  }
  get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Anmelden' });
  }
  get invalidLinkHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' });
  }
  get backToListsLink(): Locator {
    return this.page.getByRole('link', { name: 'Zu meinen Listen' });
  }
}
