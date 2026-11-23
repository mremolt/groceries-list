import type { Locator, Page } from '@playwright/test';

import { ConfirmDialog, Dialog } from './dialog';

export class EditItemDialog extends Dialog {
  get textField(): Locator {
    return this.root.getByLabel('Artikel');
  }
  get saveButton(): Locator {
    return this.root.getByRole('button', { name: 'Speichern' });
  }
  get deleteButton(): Locator {
    return this.root.getByRole('button', { name: 'Löschen' });
  }
}

/** The list page: add card, „Noch zu kaufen“, „Im Wagen“ and the item dialogs. */
export class ItemsPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get addField(): Locator {
    return this.page.getByLabel('Was fehlt?');
  }
  get addButton(): Locator {
    return this.page.getByRole('button', { name: 'Hinzufügen' });
  }

  get openSection(): Locator {
    return this.page.getByRole('region', { name: 'Noch zu kaufen' });
  }
  get openHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: /Noch zu kaufen/ });
  }
  get openItems(): Locator {
    return this.openSection.getByRole('checkbox');
  }
  openItem(text: string): Locator {
    return this.openSection.getByRole('checkbox', { name: text });
  }

  get cartSection(): Locator {
    return this.page.getByRole('region', { name: 'Im Wagen' });
  }
  /** The toggle of the folded „Im Wagen“ card; there is none where the cart is a column. */
  get cartToggle(): Locator {
    return this.page.getByRole('button', { name: /^Im Wagen/ });
  }
  cartItem(text: string): Locator {
    return this.cartSection.getByRole('checkbox', { name: text });
  }
  get clearCheckedButton(): Locator {
    return this.cartSection.getByRole('button', { name: 'Erledigte entfernen' });
  }
  /** Anywhere on the page, to prove that an item is gone from both sections. */
  item(text: string): Locator {
    return this.page.getByRole('checkbox', { name: text });
  }

  editButton(text: string): Locator {
    return this.page.getByRole('button', { name: `„${text}“ bearbeiten` });
  }

  get editDialog(): EditItemDialog {
    return new EditItemDialog(this.page, 'Artikel bearbeiten');
  }
  get clearCheckedDialog(): ConfirmDialog {
    return new ConfirmDialog(this.page, 'Erledigte entfernen?', 'Entfernen');
  }

  /** Waits for the cards, then opens „Im Wagen“ where it is folded. */
  async openCart(): Promise<void> {
    await this.openSection.waitFor(); // the cards appear with the items
    if ((await this.cartToggle.count()) > 0 && (await this.cartToggle.getAttribute('aria-expanded')) === 'false') {
      await this.cartToggle.click();
    }
  }

  async add(text: string): Promise<void> {
    await this.addField.fill(text);
    await this.addField.press('Enter');
  }

  async edit(text: string, newText: string): Promise<void> {
    await this.editButton(text).click();
    await this.editDialog.textField.fill(newText);
    await this.editDialog.saveButton.click();
  }

  async remove(text: string): Promise<void> {
    await this.editButton(text).click();
    await this.editDialog.deleteButton.click();
  }

  async clearChecked(): Promise<void> {
    await this.openCart();
    await this.clearCheckedButton.click();
    await this.clearCheckedDialog.confirm();
  }
}
