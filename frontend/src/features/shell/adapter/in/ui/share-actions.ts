import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LOAD_SHARE_LINK, RENEW_SHARE_LINK, type ShareLink, ShareListNotFoundError } from '@features/sharing';
import { TranslocoService } from '@jsverse/transloco';
import { TechnicalError } from '@platform/domain';
import { ConfirmDialogs } from '@shared/ui/dialog/confirm-dialog';
import { Snackbar } from '@shared/ui/snackbar/snackbar';

import { ListsStore } from './lists-store';
import { ShareDialog, type ShareDialogData } from './share-dialog/share-dialog';

/**
 * Sharing the open list (FR-SHARE-01, FR-SHARE-02): the share dialog, and the confirmed renewal that the dialog and the
 * ⋮ menu share. It calls the use cases of the sharing feature and shows what came back; the rules live there
 * (TS-ARCH-02). Provided at route level with the stores (NG-STATE-12).
 *
 * Focus (NG-UI-33): the share dialog is opened by a button that stays, so focus returns to it; the menu item is gone
 * after the menu closed, so the menu path returns to the ⋮ button (`fallback`).
 */
@Injectable()
export class ShareActions {
  private readonly lists = inject(ListsStore);
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialogs = inject(ConfirmDialogs);
  private readonly snackbar = inject(Snackbar);
  private readonly transloco = inject(TranslocoService);
  private readonly loadShareLink = inject(LOAD_SHARE_LINK);
  private readonly renewShareLink = inject(RENEW_SHARE_LINK);

  /** „Liste teilen“ (FR-SHARE-01). */
  share(): void {
    const list = this.lists.currentList();
    if (!list) return;
    const data: ShareDialogData = {
      listName: list.name,
      load: () => this.loadShareLink.execute(list.id),
      renew: () => this.renew(list.id),
    };
    this.dialog.open<ShareDialog, ShareDialogData>(ShareDialog, {
      data,
      autoFocus: 'dialog', // the link arrives asynchronously; the title names the dialog (FR-FB-03)
      restoreFocus: true,
    });
  }

  /** „Teilen-Link erneuern“ in the ⋮ menu (FR-SHARE-02 AC1). */
  async renewCurrent(fallback: () => HTMLElement | null): Promise<void> {
    const list = this.lists.currentList();
    if (!list) return;
    await this.renew(list.id);
    fallback()?.focus();
  }

  /** Confirms (BR-11), renews, says so (FR-SHARE-02 AC2/AC3); answers the new link, or `undefined` when nothing changed. */
  private async renew(listId: string): Promise<ShareLink | undefined> {
    const confirmed = await this.confirmDialogs.confirm({
      title: this.transloco.translate('shell.share.renewDialog.title'),
      text: this.transloco.translate('shell.share.renewDialog.text'),
      confirmLabel: this.transloco.translate('shell.share.renewDialog.confirm'),
      cancelLabel: this.transloco.translate('shell.dialog.cancel'),
    });
    if (!confirmed) return undefined;
    try {
      const link = await this.renewShareLink.execute(listId);
      this.snackbar.show(this.transloco.translate('shell.share.snackbar.renewed'));
      return link;
    } catch (error) {
      if (!(error instanceof ShareListNotFoundError) && !(error instanceof TechnicalError)) throw error;
      this.snackbar.show(this.transloco.translate('platform.error.generic'));
      return undefined;
    }
  }
}
