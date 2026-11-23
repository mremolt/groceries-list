import type { Locator, Page } from '@playwright/test';

import { ConfirmDialog, Dialog } from './dialog';
import { ShellPage } from './shell-page';

export class ShareDialog extends Dialog {
  get linkField(): Locator {
    return this.root.getByRole('textbox', { name: 'Teilen-Link' });
  }
  get copyButton(): Locator {
    return this.root.getByRole('button', { name: 'Link kopieren' });
  }
  get renewButton(): Locator {
    return this.root.getByRole('button', { name: 'Link erneuern' });
  }
  get doneButton(): Locator {
    return this.root.getByRole('button', { name: 'Fertig' });
  }
}

/** Share link and renewal on the list page. */
export class SharingPage {
  private readonly page: Page;
  private readonly shell: ShellPage;

  constructor(page: Page) {
    this.page = page;
    this.shell = new ShellPage(page);
  }

  get shareButton(): Locator {
    return this.page.getByRole('button', { name: 'Liste teilen' });
  }
  shareDialog(listName: string): ShareDialog {
    return new ShareDialog(this.page, `„${listName}“ teilen`);
  }
  get renewDialog(): ConfirmDialog {
    return new ConfirmDialog(this.page, 'Teilen-Link erneuern?', 'Erneuern');
  }

  async openShareDialog(listName: string): Promise<ShareDialog> {
    await this.shareButton.click();
    const dialog = this.shareDialog(listName);
    await dialog.linkField.waitFor();
    return dialog;
  }

  /** Opens the share dialog, reads the link and closes it again. */
  async readShareLink(listName: string): Promise<string> {
    const dialog = await this.openShareDialog(listName);
    const link = await dialog.linkField.inputValue();
    await dialog.doneButton.click();
    return link;
  }

  /** Renews the link from the ⋮ menu and confirms. */
  async renewFromMenu(): Promise<void> {
    await this.shell.chooseOption('Teilen-Link erneuern');
    await this.renewDialog.confirm();
  }
}
