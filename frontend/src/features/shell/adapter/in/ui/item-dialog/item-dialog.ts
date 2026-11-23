import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, submit } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import type { Item } from '@features/items';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ValidatedField } from '@shared/ui/field/validated-field';

import type { ItemCommandResult } from '../items-store';

export interface ItemDialogData {
  readonly item: Item;
  /** Saves the text; the dialog stays open and shows the problem when it answers `ok: false` (FR-FB-05 AC2). */
  readonly save: (text: string) => Promise<ItemCommandResult>;
  /** Deletes the item at once, without a further question (FR-ITEM-04 AC1, BR-11). */
  readonly remove: () => Promise<ItemCommandResult>;
}

/** What closes the dialog: `saved` and `deleted` change the list, `gone` means somebody else deleted the item. */
export type ItemDialogResult = 'saved' | 'deleted' | 'gone';

/**
 * „Artikel bearbeiten“ (FR-ITEM-03, FR-ITEM-04): one field with the current text, „Löschen“ on the left in the error
 * colour, „Abbrechen“ and „Speichern“ on the right; Enter submits (FR-FB-03 AC3). Same close rules as the list name
 * dialog: Esc and a click outside keep a changed text and say so (UI-21).
 *
 * Layout (NG-UI-23): a Material dialog, at most the viewport width minus margins on every size class; below 25 rem the
 * three buttons wrap instead of overflowing.
 */
@Component({
  selector: 'app-item-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    ValidatedField,
    FormField,
    TranslocoPipe,
  ],
  templateUrl: './item-dialog.html',
  styleUrl: './item-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDialog {
  private readonly ref = inject<MatDialogRef<ItemDialog, ItemDialogResult>>(MatDialogRef);
  private readonly transloco = inject(TranslocoService);
  protected readonly data = inject<ItemDialogData>(MAT_DIALOG_DATA);

  protected readonly model = signal({ text: this.data.item.text });
  protected readonly textForm = form(this.model);
  protected readonly dirty = computed(() => this.model().text !== this.data.item.text);
  protected readonly busy = signal(false);
  /** The status line under the field: why Esc did nothing (UI-21) or that saving failed (FR-FB-05). */
  protected readonly note = signal('');

  protected readonly errorMessages = computed(() => ({
    textRequired: this.transloco.translate('shell.items.error.textRequired'),
    textTooLong: this.transloco.translate('shell.items.error.textTooLong'),
    default: this.transloco.translate('platform.error.generic'),
  }));

  constructor() {
    this.ref.disableClose = true; // closing is decided here (UI-21)
    this.ref.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') this.requestClose();
    });
    this.ref.backdropClick().subscribe(() => {
      this.requestClose();
    });
  }

  private requestClose(): void {
    if (this.dirty()) this.note.set(this.transloco.translate('shell.dialog.keptHint'));
    else this.ref.close();
  }

  protected async save(): Promise<void> {
    this.note.set('');
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await submit(this.textForm, async (field) => {
        const result = await this.data.save(this.model().text);
        if (result.ok) {
          this.ref.close('saved');
          return undefined;
        }
        if (result.reason === 'gone') {
          this.ref.close('gone');
          return undefined;
        }
        if (result.reason === 'textRequired' || result.reason === 'textTooLong') {
          return [{ kind: result.reason, fieldTree: field.text }];
        }
        // The typed text stays in the field (FR-FB-05 AC2); the message belongs in the dialog, because a modal dialog
        // hides the page and its snackbar from assistive technology (UI-17).
        this.note.set(this.transloco.translate('platform.error.generic'));
        return undefined;
      });
      if (this.textForm.text().errors().length > 0) this.textForm.text().focusBoundControl();
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(): Promise<void> {
    this.note.set('');
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const result = await this.data.remove();
      if (result.ok) this.ref.close('deleted');
      else if (result.reason === 'gone') this.ref.close('gone');
      else this.note.set(this.transloco.translate('platform.error.generic'));
    } finally {
      this.busy.set(false);
    }
  }
}
