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
import type { ShoppingList } from '@features/lists';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ValidatedField } from '@shared/ui/field/validated-field';

import type { ListCommandResult } from '../lists-store';

export interface ListNameDialogData {
  readonly mode: 'create' | 'rename';
  /** The name the field starts with: empty when creating, the current name when renaming. */
  readonly name: string;
  /** Runs the command; the dialog stays open and shows the problem when it answers `ok: false` (FR-FB-05 AC2). */
  readonly submit: (name: string) => Promise<ListCommandResult>;
}

/**
 * „Neue Liste“ and „Liste umbenennen“ (FR-LIST-01, FR-LIST-02): one field, Enter submits (FR-LIST-01 AC4), the title is the
 * accessible name, focus starts in the field (FR-FB-03 AC1). The rules for the name live in the use case; its answer
 * decides which error the field shows (FR-FB-04: on submit, text starting „Fehler:“, focus on the field).
 *
 * UI-21: while the name was changed, Esc and a click outside do not discard it; the dialog says so in a visible status
 * line and „Abbrechen“ discards. Without a change Esc closes at once, like „Abbrechen“ (FR-FB-03 AC1).
 *
 * Layout (NG-UI-23): a Material dialog, 20 rem minimum width and at most the viewport width minus margins on every size
 * class; the field is full width.
 */
@Component({
  selector: 'app-list-name-dialog',
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
  templateUrl: './list-name-dialog.html',
  styleUrl: './list-name-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListNameDialog {
  private readonly ref = inject<MatDialogRef<ListNameDialog, ShoppingList>>(MatDialogRef);
  private readonly transloco = inject(TranslocoService);
  protected readonly data = inject<ListNameDialogData>(MAT_DIALOG_DATA);

  protected readonly model = signal({ name: this.data.name });
  protected readonly nameForm = form(this.model);
  protected readonly dirty = computed(() => this.model().name !== this.data.name);
  /** The status line under the field: why Esc did nothing (UI-21) or that saving failed (FR-FB-05). */
  protected readonly note = signal('');

  protected readonly errorMessages = computed(() => ({
    nameRequired: this.transloco.translate('shell.error.nameRequired'),
    nameTooLong: this.transloco.translate('shell.error.nameTooLong'),
    limitReached: this.transloco.translate('shell.error.limitReached'),
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
    if (this.dirty()) {
      this.note.set(this.transloco.translate('shell.dialog.keptHint'));
    } else {
      this.ref.close();
    }
  }

  protected async save(): Promise<void> {
    this.note.set('');
    await submit(this.nameForm, async (field) => {
      const result = await this.data.submit(this.model().name);
      if (result.ok) {
        this.ref.close(result.list ?? undefined);
        return undefined;
      }
      if (result.reason === 'failed' || result.reason === 'notFound') {
        // The typed name stays in the field (FR-FB-05 AC2). The message belongs in the dialog: a modal dialog hides the
        // page, and with it the snackbar, from assistive technology (UI-17).
        this.note.set(this.transloco.translate('platform.error.generic'));
        return undefined;
      }
      return [{ kind: result.reason, fieldTree: field.name }];
    });
    if (this.nameForm.name().errors().length > 0) this.nameForm.name().focusBoundControl();
  }
}
