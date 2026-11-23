import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import type { ShoppingList } from '@features/lists';
import { TranslocoService } from '@jsverse/transloco';
import { ConfirmDialogs } from '@shared/ui/dialog/confirm-dialog';
import { Snackbar } from '@shared/ui/snackbar/snackbar';

import { ListNameDialog, type ListNameDialogData } from './list-name-dialog/list-name-dialog';
import { type ListCommandResult, ListsStore } from './lists-store';

/**
 * The list commands of the navigation (FR-LIST-01..04): dialog, command, snackbar, navigation. It forwards intent to the
 * store and shows what came back; the rules are in the use cases (TS-ARCH-02). Provided at route level with the store.
 *
 * Focus (UI-18, NG-UI-33): when the control that opened a dialog is gone or hidden (the menu item, the closed drawer),
 * focus returns to `fallback`; after delete and leave the route change moves focus to the new page's heading.
 */
@Injectable()
export class ListActions {
  private readonly store = inject(ListsStore);
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialogs = inject(ConfirmDialogs);
  private readonly snackbar = inject(Snackbar);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  /** „Neue Liste“ (FR-LIST-01): opens the new list and says so. */
  async create(fallback: () => HTMLElement | null): Promise<void> {
    const list = await this.askForName({ mode: 'create', name: '', submit: (name) => this.store.create(name) });
    this.restoreFocus(fallback);
    if (!list) return;
    this.snackbar.show(this.transloco.translate('shell.snackbar.created'));
    await this.router.navigate(['/listen', list.id]);
  }

  /** „Liste umbenennen“ (FR-LIST-02). */
  async renameCurrent(fallback: () => HTMLElement | null): Promise<void> {
    const list = this.store.currentList();
    if (!list) return;
    const renamed = await this.askForName({
      mode: 'rename',
      name: list.name,
      submit: (name) => this.store.rename(list.id, name),
    });
    this.restoreFocus(fallback);
    if (renamed) this.snackbar.show(this.transloco.translate('shell.snackbar.saved'));
  }

  /** „Liste löschen“ (FR-LIST-03, BR-11): after confirming, for everyone. */
  async deleteCurrent(fallback: () => HTMLElement | null): Promise<void> {
    const list = this.store.currentList();
    if (!list) return;
    const confirmed = await this.confirmDialogs.confirm({
      title: this.transloco.translate('shell.dialog.delete.title', { name: list.name }),
      text: this.transloco.translate('shell.dialog.delete.text'),
      confirmLabel: this.transloco.translate('shell.dialog.delete.confirm'),
      cancelLabel: this.transloco.translate('shell.dialog.cancel'),
      destructive: true,
    });
    if (!confirmed) {
      this.restoreFocus(fallback);
      return;
    }
    await this.leaveOrDelete(await this.store.delete(list.id), 'shell.snackbar.deleted', fallback);
  }

  /** „Liste verlassen“ (FR-LIST-04): the last member leaving deletes the list on the server (BR-04). */
  async leaveCurrent(fallback: () => HTMLElement | null): Promise<void> {
    const list = this.store.currentList();
    if (!list) return;
    const confirmed = await this.confirmDialogs.confirm({
      title: this.transloco.translate('shell.dialog.leave.title', { name: list.name }),
      text: this.transloco.translate('shell.dialog.leave.text'),
      confirmLabel: this.transloco.translate('shell.dialog.leave.confirm'),
      cancelLabel: this.transloco.translate('shell.dialog.cancel'),
    });
    if (!confirmed) {
      this.restoreFocus(fallback);
      return;
    }
    await this.leaveOrDelete(await this.store.leave(list.id), 'shell.snackbar.left', fallback);
  }

  private async leaveOrDelete(
    result: ListCommandResult,
    messageKey: string,
    fallback: () => HTMLElement | null,
  ): Promise<void> {
    if (!result.ok && result.reason !== 'notFound') {
      this.snackbar.show(this.transloco.translate('platform.error.generic'));
      this.restoreFocus(fallback);
      return;
    }
    // next list in the order of BR-10, or the empty state: the start route decides (FR-LIST-03 AC2)
    await this.router.navigateByUrl('/');
    this.snackbar.show(this.transloco.translate(result.ok ? messageKey : 'shell.snackbar.gone'));
  }

  private async askForName(data: ListNameDialogData): Promise<ShoppingList | undefined> {
    const ref = this.dialog.open<ListNameDialog, ListNameDialogData, ShoppingList>(ListNameDialog, {
      data,
      autoFocus: 'input',
      restoreFocus: false, // the caller restores focus explicitly (NG-UI-33)
    });
    return await new Promise<ShoppingList | undefined>((resolve) => {
      ref.afterClosed().subscribe((result) => {
        resolve(result);
      });
    });
  }

  /**
   * The opener is usually gone or hidden (menu item, closed drawer), so focus goes to an element that stays: the ⋮ button,
   * the menu button or the opening button itself. Done explicitly instead of relying on the dialog's own restore, which
   * targets the removed opener (NG-UI-33).
   */
  private restoreFocus(fallback: () => HTMLElement | null): void {
    fallback()?.focus();
  }
}
