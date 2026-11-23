import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, input, model, output, viewChild } from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';

import { AppIcon } from '../icon/app-icon';

let nextFieldId = 1;

/**
 * Text field with the validation pattern of FR-FB-04, bound with `[formField]` (Signal Forms, NG-ARCH-16): visible label
 * (NG-UI-12), errors only after the field was touched, so not while typing; the error is red-bordered (2 px), has an
 * icon and a text starting with "Fehler:", is linked to the input (`aria-describedby`, `aria-invalid`) and
 * `focus()` lets the form move focus to the first invalid field. Values stay in the model after an error.
 *
 * Layout (NG-UI-23): full width of its container on every size class (UI-13).
 */
@Component({
  selector: 'app-validated-field',
  imports: [MatFormFieldModule, MatInput, AppIcon, TranslocoPipe],
  templateUrl: './validated-field.html',
  styleUrl: './validated-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidatedField implements FormValueControl<string> {
  readonly value = model('');
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly touched = input(false);
  readonly disabled = input(false);
  readonly touch = output();

  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input<string>('off');
  readonly inputmode = input<'text' | 'email' | 'none'>('text');
  readonly hint = input<string>('');
  /** Example text inside the empty field; it never replaces the label (NG-UI-12). */
  readonly placeholder = input<string>('');
  /** Text per error `kind`; `default` answers any kind without an entry (messages are translated by the caller). */
  readonly errorMessages = input<Readonly<Record<string, string>>>({});

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly showError = computed(() => this.touched() && this.errors().length > 0);
  protected readonly message = computed(() => {
    const first = this.errors()[0];
    const messages = this.errorMessages();
    return (first ? messages[first.kind] : undefined) ?? messages['default'] ?? '';
  });
  protected readonly errorId = `app-field-error-${String(nextFieldId++)}`;

  focus(): void {
    this.inputRef().nativeElement.focus();
  }

  protected onInput(text: string): void {
    this.value.set(text);
  }
}
