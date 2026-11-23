import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import type { MatDialog } from '@angular/material/dialog';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';

export interface ConfirmDialogData {
  readonly title: string;
  readonly text: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  /** Destructive confirmations use the error colour (FR-LIST-03). */
  readonly destructive?: boolean;
}

const DESCRIPTION_ID = 'confirm-dialog-text';

/**
 * Modal confirmation (FR-FB-03): the title is the accessible name, the text the description; focus starts on the least
 * destructive button (cancel), stays inside, Esc and a click outside close it like cancel, and focus returns to the
 * element that opened it.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  protected readonly descriptionId = DESCRIPTION_ID;
}

/** Opens {@link ConfirmDialog} and answers whether the user confirmed. */
export class ConfirmDialogs {
  constructor(private readonly dialog: MatDialog) {}

  async confirm(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
      ariaDescribedBy: DESCRIPTION_ID,
      autoFocus: '[cdkFocusInitial]', // the least destructive button (FR-FB-03 AC1)
      restoreFocus: true,
    });
    return (
      (await new Promise<boolean | undefined>((resolve) => {
        ref.afterClosed().subscribe((result) => {
          resolve(result);
        });
      })) === true
    );
  }
}
