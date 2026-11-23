import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import type { DeleteAccountResult } from '../settings-store';

export interface AccountDeleteDialogData {
  /** Runs the deletion; the dialog stays open and says so when it answers `failed` (FR-FB-05 AC2). */
  readonly submit: () => Promise<DeleteAccountResult>;
}

const DESCRIPTION_ID = 'account-delete-dialog-text';

/**
 * The final „Konto löschen?“ (FR-SET-04, ADR 0003): shown after the identity provider confirmed the password again. The
 * password field of the requirement is that confirmation. The title is the accessible name, the text the description;
 * focus starts on the least destructive button (FR-FB-03 AC1). A failed delete keeps the dialog open with a visible
 * status line, because a modal dialog hides the page, and with it the snackbar, from assistive technology (UI-17).
 *
 * Layout (NG-UI-23): a Material dialog on every size class.
 */
@Component({
  selector: 'app-account-delete-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, TranslocoPipe],
  templateUrl: './account-delete-dialog.html',
  styleUrl: './account-delete-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeleteDialog {
  private readonly ref = inject<MatDialogRef<AccountDeleteDialog, DeleteAccountResult>>(MatDialogRef);
  private readonly transloco = inject(TranslocoService);
  private readonly data = inject<AccountDeleteDialogData>(MAT_DIALOG_DATA);

  protected readonly descriptionId = DESCRIPTION_ID;
  protected readonly running = signal(false);
  /** The status line: why the dialog is still open. */
  protected readonly note = signal('');

  protected async confirm(): Promise<void> {
    if (this.running()) return;
    this.running.set(true);
    this.note.set('');
    const result = await this.data.submit();
    this.running.set(false);
    if (result === 'failed') {
      this.note.set(this.transloco.translate('platform.error.generic'));
      return;
    }
    this.ref.close(result);
  }
}

export const ACCOUNT_DELETE_DESCRIPTION_ID = DESCRIPTION_ID;
