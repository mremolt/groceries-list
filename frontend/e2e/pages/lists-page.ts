import type { Locator, Page } from '@playwright/test';

import { ConfirmDialog, Dialog } from './dialog';
import { ShellPage } from './shell-page';

/** Create or rename dialog: one name field. */
export class ListNameDialog extends Dialog {
  get nameField(): Locator {
    return this.root.getByLabel('Name der Liste');
  }
  get createButton(): Locator {
    return this.root.getByRole('button', { name: 'Erstellen' });
  }
  get saveButton(): Locator {
    return this.root.getByRole('button', { name: 'Speichern' });
  }
}

/** Lists: the empty state and the commands on the current list (create, rename, delete, leave). */
export class ListsPage {
  private readonly page: Page;
  private readonly shell: ShellPage;

  constructor(page: Page) {
    this.page = page;
    this.shell = new ShellPage(page);
  }

  get emptyStateHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Noch keine Listen' });
  }
  get emptyStateCreateButton(): Locator {
    return this.shell.main.getByRole('button', { name: 'Neue Liste' });
  }
  /** The first „Neue Liste“ button: in the drawer once a list exists, in the page when there is none. */
  get newListButton(): Locator {
    return this.page.getByRole('button', { name: 'Neue Liste' }).first();
  }
  get notFoundLink(): Locator {
    return this.page.getByRole('link', { name: 'Zu meinen Listen' });
  }

  get createDialog(): ListNameDialog {
    return new ListNameDialog(this.page, 'Neue Liste');
  }
  get renameDialog(): ListNameDialog {
    return new ListNameDialog(this.page, 'Liste umbenennen');
  }
  deleteDialog(listName?: string): ConfirmDialog {
    return new ConfirmDialog(
      this.page,
      listName === undefined ? /^„.+“ löschen\?$/ : `„${listName}“ löschen?`,
      'Löschen',
    );
  }
  leaveDialog(listName?: string): ConfirmDialog {
    return new ConfirmDialog(
      this.page,
      listName === undefined ? /^„.+“ verlassen\?$/ : `„${listName}“ verlassen?`,
      'Verlassen',
    );
  }

  /** Opens the create dialog from the drawer. */
  async startCreate(): Promise<void> {
    await this.shell.openDrawer();
    await this.shell.newListButton.click();
    await this.createDialog.root.waitFor();
  }

  /** Creates a list with the first „Neue Liste“ button and the Enter key. */
  async create(name: string): Promise<void> {
    await this.newListButton.click();
    await this.createDialog.nameField.fill(name);
    await this.page.keyboard.press('Enter');
  }

  async rename(name: string): Promise<void> {
    await this.shell.chooseOption('Liste umbenennen');
    await this.renameDialog.nameField.fill(name);
    await this.renameDialog.saveButton.click();
  }

  async delete(): Promise<void> {
    await this.shell.chooseOption('Liste löschen');
    await this.deleteDialog().confirm();
  }
}
