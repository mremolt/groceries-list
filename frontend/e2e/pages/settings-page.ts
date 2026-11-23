import type { Locator, Page } from '@playwright/test';

import { ConfirmDialog } from './dialog';

export class SettingsPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get displayNameField(): Locator {
    return this.page.getByLabel('Anzeigename');
  }
  get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Speichern' });
  }
  get themeGroup(): Locator {
    return this.page.getByRole('radiogroup', { name: 'Design' });
  }
  themeOption(name: 'System' | 'Hell' | 'Dunkel'): Locator {
    return this.themeGroup.getByRole('radio', { name });
  }
  get signOutButton(): Locator {
    return this.page.getByRole('button', { name: 'Abmelden' });
  }
  get deleteAccountButton(): Locator {
    return this.page.getByRole('button', { name: 'Konto löschen' });
  }
  get deleteAccountDialog(): ConfirmDialog {
    return new ConfirmDialog(this.page, 'Konto löschen?', 'Konto löschen');
  }

  async saveDisplayName(name: string): Promise<void> {
    await this.displayNameField.fill(name);
    await this.saveButton.click();
  }

  async deleteAccount(): Promise<void> {
    await this.deleteAccountButton.click();
    await this.deleteAccountDialog.confirm();
  }
}
