import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { form, FormField, submit } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { focusTargetAfterChecking, type Item } from '@features/items';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmDialogs } from '@shared/ui/dialog/confirm-dialog';
import { ValidatedField } from '@shared/ui/field/validated-field';
import { AppIcon } from '@shared/ui/icon/app-icon';
import { WindowSize } from '@shared/ui/layout/window-size';
import { LoadingIndicator } from '@shared/ui/loading/loading-indicator';
import { Snackbar } from '@shared/ui/snackbar/snackbar';

import { ItemDialog, type ItemDialogData, type ItemDialogResult } from './item-dialog/item-dialog';
import { ItemsStore } from './items-store';
import { ListsStore } from './lists-store';

/**
 * The body of a list page (FR-ITEM-01..06, FR-FB-01 AC2/AC3): the card „Artikel hinzufügen“, „Noch zu kaufen“ with badge
 * and progress, and „Im Wagen“. It forwards intent to the items store and shows what came back (TS-ARCH-02); the rules
 * live in the use cases. Checking is shown at once and undone with the error snackbar when saving fails (FR-FB-05).
 *
 * Layout (NG-UI-23): compact stacks the cards in one column and folds „Im Wagen“ into a collapsible card (structure, so
 * the size class decides); medium and expanded put „Noch zu kaufen“ (3 fr) and „Im Wagen“ (2 fr) side by side under the
 * full-width add card, as in the mockups. The add button is icon-only on compact (CSS, the name stays).
 *
 * Focus (FR-ITEM-01 AC3, FR-ITEM-02 AC3, NG-UI-33): the add field keeps the focus after adding; after checking, focus
 * moves to the next open item (the previous one when it was the last), after unchecking it follows the item.
 */
@Component({
  selector: 'app-list-items',
  imports: [
    AppIcon,
    FormField,
    LoadingIndicator,
    MatButton,
    MatCheckbox,
    MatIconButton,
    MatProgressBar,
    NgTemplateOutlet,
    TranslocoPipe,
    ValidatedField,
  ],
  templateUrl: './list-items.html',
  styleUrl: './list-items.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListItems {
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialogs = inject(ConfirmDialogs);
  private readonly snackbar = inject(Snackbar);
  private readonly transloco = inject(TranslocoService);
  private readonly lists = inject(ListsStore);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly store = inject(ItemsStore);
  protected readonly sizeClass = inject(WindowSize).sizeClass;

  readonly listId = input.required<string>();

  /** Id of the collapsible „Im Wagen“ body, referenced by the toggle's `aria-controls`. */
  protected readonly cartBodyId = 'cart-body';

  protected readonly model = signal({ text: '' });
  protected readonly addForm = form(this.model);
  private readonly addField = viewChild(ValidatedField);

  /** „Im Wagen“ on compact: collapsed by default (FR-ITEM-06 AC1). */
  protected readonly cartOpen = signal(false);
  protected readonly compact = computed(() => this.sizeClass() === 'compact');
  protected readonly progress = computed(() => {
    const total = this.store.total();
    return total === 0 ? 0 : Math.round((this.store.checkedCount() / total) * 100);
  });

  constructor() {
    effect(() => {
      const id = this.listId();
      untracked(() => {
        void this.store.load(id);
      });
    });
    // the drawer follows the items without another request (API-N1-01): store-to-store sync through the page (NG-STATE-03)
    effect(() => {
      if (this.store.status() !== 'ready' || this.store.listId() !== this.listId()) return;
      const count = this.store.openCount();
      untracked(() => {
        this.lists.setOpenCount(this.listId(), count);
      });
    });
  }

  protected reload(): void {
    void this.store.load(this.listId());
  }

  /** FR-ITEM-01: one free-text line; the field is cleared and keeps the focus after the item was saved. */
  protected async add(): Promise<void> {
    const text = this.model().text;
    await submit(this.addForm, async (field) => {
      const result = await this.store.add(text);
      if (result.ok) {
        if (this.model().text === text) this.addForm().reset({ text: '' }); // never wipe what was typed meanwhile
        return undefined;
      }
      if (result.reason === 'busy') return undefined;
      if (result.reason === 'failed' || result.reason === 'gone') {
        this.snackbar.show(this.transloco.translate('platform.error.generic')); // the typed text stays (FR-FB-05 AC2)
        return undefined;
      }
      return [{ kind: result.reason, fieldTree: field.text }];
    });
    this.addField()?.focus();
  }

  /** FR-ITEM-02: the move is shown at once; the focus stays on the person's place in the list. */
  protected async check(item: Item, checked: boolean): Promise<void> {
    const row = this.document.activeElement?.closest('[data-item-id]');
    const hadFocus = row !== null && row !== undefined && this.host.nativeElement.contains(row);
    const target = checked ? focusTargetAfterChecking(this.store.items(), item.id) : item.id;
    const saving = this.store.setDone(item.id, checked); // patches the state before its first await
    if (hadFocus) this.focusItem(target);
    const result = await saving;
    if (result.ok) return;
    this.snackbar.show(
      this.transloco.translate(result.reason === 'gone' ? 'shell.items.snackbar.gone' : 'platform.error.generic'),
    );
  }

  /** FR-ITEM-03/04: edit or delete in one dialog. */
  protected async edit(item: Item): Promise<void> {
    const ref = this.dialog.open<ItemDialog, ItemDialogData, ItemDialogResult>(ItemDialog, {
      data: {
        item,
        save: (text) => this.store.edit(item.id, text),
        remove: () => this.store.remove(item.id),
      },
      autoFocus: 'input',
      restoreFocus: false, // the opener is gone after „Löschen“; focus is restored explicitly (NG-UI-33)
    });
    const result = await new Promise<ItemDialogResult | undefined>((resolve) => {
      ref.afterClosed().subscribe((value) => {
        resolve(value);
      });
    });
    if (result === 'saved') this.snackbar.show(this.transloco.translate('shell.snackbar.saved'));
    if (result === 'gone') this.snackbar.show(this.transloco.translate('shell.items.snackbar.gone'));
    if (result === 'deleted' || result === 'gone') this.addField()?.focus();
    else this.focusEditButton(item.id);
  }

  /** FR-ITEM-05: only the items that were checked when the dialog opened (AC4). */
  protected async clearChecked(): Promise<void> {
    const ids = this.store.checked().map((item) => item.id);
    const confirmed = await this.confirmDialogs.confirm({
      title: this.transloco.translate('shell.items.dialog.clear.title'),
      text: this.transloco.translate('shell.items.dialog.clear.text', { count: ids.length }),
      confirmLabel: this.transloco.translate('shell.items.dialog.clear.confirm'),
      cancelLabel: this.transloco.translate('shell.dialog.cancel'),
      destructive: true,
    });
    if (!confirmed) return; // the dialog returns focus to „Erledigte entfernen“
    const result = await this.store.clearChecked(ids);
    this.snackbar.show(this.transloco.translate(result.ok ? 'shell.items.snackbar.cleared' : 'platform.error.generic'));
    this.addField()?.focus(); // the button that opened the dialog is gone
  }

  protected toggleCart(): void {
    this.cartOpen.update((open) => !open);
  }

  /** After the next render, because the checked item moves to the other section and its element is replaced. */
  private focusItem(id: string | null): void {
    afterNextRender(
      () => {
        const checkbox =
          id === null
            ? null
            : this.host.nativeElement.querySelector<HTMLElement>(
                `[data-item-id="${CSS.escape(id)}"] input[type=checkbox]`,
              );
        if (checkbox) checkbox.focus();
        else this.addField()?.focus();
      },
      { injector: this.injector },
    );
  }

  private focusEditButton(id: string): void {
    const button = this.host.nativeElement.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id)}"] .edit`);
    (button ?? this.host.nativeElement.querySelector<HTMLElement>('input'))?.focus();
  }
}
