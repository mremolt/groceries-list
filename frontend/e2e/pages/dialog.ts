import type { Locator, Page } from '@playwright/test';

/** A Material dialog, found by its accessible name. Every locator is scoped to the dialog (TS-TEST-42). */
export class Dialog {
  protected readonly page: Page;
  private readonly name: string | RegExp;

  constructor(page: Page, name: string | RegExp) {
    this.page = page;
    this.name = name;
  }

  get root(): Locator {
    return this.page.getByRole('dialog', { name: this.name });
  }

  get status(): Locator {
    return this.root.getByRole('status');
  }

  get cancelButton(): Locator {
    return this.root.getByRole('button', { name: 'Abbrechen' });
  }
}

/** A question with „Abbrechen“ and one confirming button. */
export class ConfirmDialog extends Dialog {
  private readonly confirmLabel: string;

  constructor(page: Page, name: string | RegExp, confirmLabel: string) {
    super(page, name);
    this.confirmLabel = confirmLabel;
  }

  get confirmButton(): Locator {
    return this.root.getByRole('button', { name: this.confirmLabel });
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }
}
