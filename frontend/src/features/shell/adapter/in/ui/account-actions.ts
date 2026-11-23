import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoService } from '@jsverse/transloco';
import { LOGIN_PATH, PAGE_NAVIGATION } from '@platform';
import { ConfirmDialogs } from '@shared/ui/dialog/confirm-dialog';
import { Snackbar } from '@shared/ui/snackbar/snackbar';

import { ACCOUNT_DELETE_DESCRIPTION_ID, AccountDeleteDialog } from './account-delete-dialog/account-delete-dialog';
import { type DeleteAccountResult, SettingsStore } from './settings-store';

/** The BFF's login endpoint with a forced new login at the identity provider (ADR 0003, FR-SET-04). */
const REAUTHENTICATE_PATH = `${LOGIN_PATH}?reauth=1`;

/**
 * Deleting the account (FR-SET-04, ADR 0003): „Konto löschen“ asks, then sends the whole page to the identity provider to
 * enter the password again; the BFF returns to `/einstellungen?konto-loeschen`, where the final confirmation deletes.
 * Dialogs, navigation and the error message live here; the rules are in the use case (TS-ARCH-02).
 *
 * Focus (UI-18, NG-UI-33): when a dialog is cancelled, focus returns to `fallback` (the „Konto löschen“ row).
 */
@Injectable()
export class AccountActions {
  private readonly store = inject(SettingsStore);
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialogs = inject(ConfirmDialogs);
  private readonly navigation = inject(PAGE_NAVIGATION);
  private readonly snackbar = inject(Snackbar);
  private readonly transloco = inject(TranslocoService);

  /** First step: explain, then leave for the new login. A cancelled dialog changes nothing. */
  async start(): Promise<void> {
    const confirmed = await this.confirmDialogs.confirm({
      title: this.transloco.translate('shell.settings.account.dialog.title'),
      text: `${this.transloco.translate('shell.settings.account.dialog.text')} ${this.transloco.translate('shell.settings.account.dialog.reauthStart')}`,
      confirmLabel: this.transloco.translate('shell.settings.account.dialog.confirm'),
      cancelLabel: this.transloco.translate('shell.dialog.cancel'),
      destructive: true,
    });
    if (confirmed) this.navigation.assign(REAUTHENTICATE_PATH);
  }

  /** Final step, after the new login: deletes, then goes to the login. */
  async finish(fallback: () => HTMLElement | null): Promise<void> {
    const ref = this.dialog.open<
      AccountDeleteDialog,
      { submit: () => Promise<DeleteAccountResult> },
      DeleteAccountResult
    >(AccountDeleteDialog, {
      data: { submit: () => this.delete() },
      ariaDescribedBy: ACCOUNT_DELETE_DESCRIPTION_ID,
      autoFocus: '[cdkFocusInitial]',
      restoreFocus: false, // opened without a trigger: focus goes to `fallback` itself
    });
    const result = await new Promise<DeleteAccountResult | undefined>((resolve) => {
      ref.afterClosed().subscribe((answer) => {
        resolve(answer);
      });
    });
    if (result === 'deleted') this.navigation.assign(LOGIN_PATH);
    else if (result === 'reauthenticate') this.navigation.assign(REAUTHENTICATE_PATH);
    else fallback()?.focus();
  }

  private async delete(): Promise<DeleteAccountResult> {
    const result = await this.store.deleteAccount();
    if (result === 'failed') this.snackbar.show(this.transloco.translate('platform.error.generic'));
    return result;
  }
}
