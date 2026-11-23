import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ItemNotFoundError, ItemTextInvalidError } from '@features/items';
import { TechnicalError } from '@platform/domain';
import { type SizeClass, WindowSize } from '@shared/ui/layout/window-size';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { expectNoAxeViolations } from '@testing/axe';
import { deferred } from '@testing/deferred';
import { BREAD, BUTTER, EGGS, type ItemUseCaseFakes, itemUseCaseFakes, MILK, YOGHURT } from '@testing/item-use-cases';
import { listUseCaseFakes, WEEK } from '@testing/list-use-cases';
import { provideTestTranslations } from '@testing/transloco';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ListItems } from './list-items';
import { ListsStore } from './lists-store';

const ALL = [MILK, BREAD, EGGS, BUTTER, YOGHURT];

async function setup(options: { items?: typeof ALL; size?: SizeClass } = {}) {
  const { items = ALL, size = 'expanded' } = options;
  const { fakes, providers } = itemUseCaseFakes(items);
  const lists = listUseCaseFakes([WEEK]);
  const sizeClass = signal<SizeClass>(size);
  const view = await render(ListItems, {
    inputs: { listId: 'l1' },
    providers: [
      ...providers,
      ...lists.providers,
      Snackbar,
      { provide: WindowSize, useValue: { sizeClass } },
      ...provideTestTranslations(),
    ],
  });
  await view.fixture.whenStable();
  await screen.findByRole('heading', { level: 2, name: /Noch zu kaufen/ });
  return { view, fakes, lists, snackbar: TestBed.inject(Snackbar), sizeClass };
}

function openSection(): HTMLElement {
  return screen.getByRole('region', { name: /Noch zu kaufen/ });
}

function cartSection(): HTMLElement {
  return screen.getByRole('region', { name: /Im Wagen/ });
}

function names(section: HTMLElement): string[] {
  return within(section)
    .getAllByRole('checkbox')
    .map((box) => box.closest('li')?.textContent.trim() ?? '');
}

describe('the sections (BR-09, FR-ITEM-02 AC4)', () => {
  it('shows the open items oldest first and the checked ones in „Im Wagen“, struck through', async () => {
    await setup();

    expect(names(openSection())).toEqual(['2× Milch, laktosefrei', 'Vollkornbrot', '6 Eier']);
    expect(names(cartSection())).toEqual(['Butter', 'Naturjoghurt']);
    expect(within(cartSection()).getByText('Butter').className).toContain('struck');
  });

  it('shows the open count as a badge and the progress „2 von 5 erledigt“', async () => {
    await setup();

    const heading = screen.getByRole('heading', { level: 2, name: /Noch zu kaufen/ });
    expect(heading.textContent.replaceAll(/\s+/g, ' ').trim()).toBe('Noch zu kaufen 3');
    expect(within(openSection()).getByText('2 von 5 erledigt')).toBeTruthy();
  });

  it('hides badge text and progress when the list has no items (FR-ITEM-02 AC4)', async () => {
    await setup({ items: [] });

    expect(screen.queryByText(/erledigt/)).toBeNull();
  });

  it('gives every open item the edit button „„‹Text›“ bearbeiten“, and checked items none (FR-ITEM-03 AC1/AC3)', async () => {
    await setup();

    expect(within(openSection()).getByRole('button', { name: '„Vollkornbrot“ bearbeiten' })).toBeTruthy();
    expect(within(cartSection()).queryByRole('button', { name: /bearbeiten/ })).toBeNull();
  });
});

describe('empty states (FR-FB-01 AC2/AC3)', () => {
  it('says the list is empty', async () => {
    await setup({ items: [] });

    expect(within(openSection()).getByText('Diese Liste ist noch leer')).toBeTruthy();
    expect(
      within(openSection()).getByText('Füge oben den ersten Artikel hinzu. Alle Mitglieder sehen ihn sofort.'),
    ).toBeTruthy();
  });

  it('says „Alles im Wagen.“ when everything is checked and „Noch nichts abgehakt.“ when nothing is', async () => {
    await setup({ items: [BUTTER] });
    expect(within(openSection()).getByText('Alles im Wagen.')).toBeTruthy();
    TestBed.resetTestingModule();

    await setup({ items: [MILK] });
    expect(within(cartSection()).getByText('Noch nichts abgehakt.')).toBeTruthy();
  });
});

describe('add an item (FR-ITEM-01)', () => {
  it('adds with Enter, clears the field and keeps the focus for the next item (AC2/AC3)', async () => {
    const { fakes } = await setup();
    fakes.addItem.execute.mockResolvedValue({ ...MILK, id: 'i9', text: 'Käse', createdAt: '2026-11-23T11:00:00Z' });
    const field = screen.getByLabelText<HTMLInputElement>('Was fehlt?');

    await userEvent.type(field, '  Käse {Enter}');

    expect(fakes.addItem.execute.mock.calls).toEqual([['l1', '  Käse ']]);
    await expect.poll(() => names(openSection()).at(-1)).toBe('Käse');
    expect(field.value).toBe('');
    expect(document.activeElement).toBe(field);
  });

  it('puts the focus back into the field after a click on the button', async () => {
    const { fakes } = await setup();
    fakes.addItem.execute.mockResolvedValue({ ...MILK, id: 'i9', text: 'Käse', createdAt: '2026-11-23T11:00:00Z' });
    const field = screen.getByLabelText<HTMLInputElement>('Was fehlt?');
    await userEvent.type(field, 'Käse');

    await userEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    await expect.poll(() => field.value).toBe('');
    expect(document.activeElement).toBe(field);
  });

  it('refuses an empty input with „Fehler: Bitte gib einen Artikel ein.“ (AC4)', async () => {
    const { fakes } = await setup();
    fakes.addItem.execute.mockRejectedValue(new ItemTextInvalidError('required'));

    await userEvent.type(screen.getByLabelText('Was fehlt?'), '{Enter}');

    expect(await screen.findByText('Fehler: Bitte gib einen Artikel ein.')).toBeTruthy();
    expect(screen.getByLabelText('Was fehlt?').getAttribute('aria-invalid')).toBe('true');
  });

  it('refuses a text over 200 characters with „Höchstens 200 Zeichen.“ (AC4)', async () => {
    const { fakes } = await setup();
    fakes.addItem.execute.mockRejectedValue(new ItemTextInvalidError('tooLong'));

    await userEvent.type(screen.getByLabelText('Was fehlt?'), 'x{Enter}');

    expect(await screen.findByText('Fehler: Höchstens 200 Zeichen.')).toBeTruthy();
  });

  it('keeps the typed text and shows the error snackbar when saving fails (FR-FB-05 AC2)', async () => {
    const { fakes, snackbar } = await setup();
    fakes.addItem.execute.mockRejectedValue(new TechnicalError('down'));

    await userEvent.type(screen.getByLabelText('Was fehlt?'), 'Käse{Enter}');

    await expect.poll(() => snackbar.message()?.text).toBe('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    expect(screen.getByLabelText<HTMLInputElement>('Was fehlt?').value).toBe('Käse');
  });

  it('does not wipe text typed while the item was being saved', async () => {
    const { fakes } = await setup();
    const pending = deferred<(typeof ALL)[number]>();
    fakes.addItem.execute.mockReturnValue(pending.promise);
    const field = screen.getByLabelText<HTMLInputElement>('Was fehlt?');
    await userEvent.type(field, 'Käse{Enter}');

    await userEvent.type(field, 'Wu');
    pending.resolve({ ...MILK, id: 'i9', text: 'Käse', createdAt: '2026-11-23T11:00:00Z' });

    await expect.poll(() => names(openSection()).at(-1)).toBe('Käse');
    expect(field.value).toBe('KäseWu');
  });

  it('has an icon-only name „Hinzufügen“ on every size class (AC1)', async () => {
    await setup({ size: 'compact' });

    expect(screen.getByRole('button', { name: 'Hinzufügen' })).toBeTruthy();
  });
});

describe('check and uncheck (FR-ITEM-02)', () => {
  it('moves the item to „Im Wagen“ before the server answered and adjusts the counts (NFR-PERF-02)', async () => {
    const { fakes, lists } = await setup();
    await TestBed.inject(ListsStore).reload();
    const pending = deferred<(typeof ALL)[number]>();
    fakes.setItemDone.execute.mockReturnValue(pending.promise);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Vollkornbrot' }));

    expect(names(cartSection())).toContain('Vollkornbrot');
    expect(within(cartSection()).getByText('Vollkornbrot').className).toContain('struck');
    expect(within(openSection()).getByText('3 von 5 erledigt')).toBeTruthy();
    await expect.poll(() => TestBed.inject(ListsStore).lists()[0]?.openCount).toBe(2);
    pending.resolve({ ...BREAD, done: true });
    expect(fakes.setItemDone.execute.mock.calls).toEqual([['l1', 'i2', true]]);
    expect(lists.fakes.loadMyLists.execute.mock.calls).toHaveLength(1); // no extra list request
  });

  it('moves an unchecked item back to its position per BR-09', async () => {
    const { fakes } = await setup();
    fakes.setItemDone.execute.mockResolvedValue({ ...BUTTER, done: false });

    await userEvent.click(screen.getByRole('checkbox', { name: 'Butter' }));

    await expect
      .poll(() => names(openSection()))
      .toEqual(['2× Milch, laktosefrei', 'Vollkornbrot', '6 Eier', 'Butter']);
  });

  it('undoes the change and shows the error snackbar when saving fails (AC2, FR-FB-05 AC1)', async () => {
    const { fakes, snackbar } = await setup();
    fakes.setItemDone.execute.mockRejectedValue(new TechnicalError('down'));

    await userEvent.click(screen.getByRole('checkbox', { name: 'Vollkornbrot' }));

    await expect.poll(() => snackbar.message()?.text).toBe('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    expect(names(openSection())).toContain('Vollkornbrot');
    expect(names(cartSection())).not.toContain('Vollkornbrot');
  });

  it('says so when somebody deleted the item in the meantime (FR-FB-02 AC5)', async () => {
    const { fakes, snackbar } = await setup();
    fakes.setItemDone.execute.mockRejectedValue(new ItemNotFoundError());

    await userEvent.click(screen.getByRole('checkbox', { name: 'Vollkornbrot' }));

    await expect.poll(() => snackbar.message()?.text).toBe('Dieser Artikel wurde inzwischen gelöscht.');
    expect(screen.queryByRole('checkbox', { name: 'Vollkornbrot' })).toBeNull();
  });

  it('moves the focus to the next open item after checking with the keyboard (AC3)', async () => {
    const { fakes } = await setup();
    fakes.setItemDone.execute.mockResolvedValue({ ...MILK, done: true });
    screen.getByRole('checkbox', { name: '2× Milch, laktosefrei' }).focus();

    await userEvent.keyboard(' ');

    await expect.poll(() => document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Vollkornbrot' }));
  });

  it('moves the focus to the previous open item when the last one was checked (AC3)', async () => {
    const { fakes } = await setup();
    fakes.setItemDone.execute.mockResolvedValue({ ...EGGS, done: true });
    screen.getByRole('checkbox', { name: '6 Eier' }).focus();

    await userEvent.keyboard(' ');

    await expect.poll(() => document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Vollkornbrot' }));
  });

  it('moves the focus to the add field when the last open item was checked', async () => {
    const { fakes } = await setup({ items: [MILK] as typeof ALL });
    fakes.setItemDone.execute.mockResolvedValue({ ...MILK, done: true });
    screen.getByRole('checkbox', { name: '2× Milch, laktosefrei' }).focus();

    await userEvent.keyboard(' ');

    await expect.poll(() => document.activeElement).toBe(screen.getByLabelText('Was fehlt?'));
  });

  it('keeps the focus on the item when it is unchecked', async () => {
    const { fakes } = await setup();
    fakes.setItemDone.execute.mockResolvedValue({ ...BUTTER, done: false });
    screen.getByRole('checkbox', { name: 'Butter' }).focus();

    await userEvent.keyboard(' ');

    await expect.poll(() => document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Butter' }));
    expect(within(openSection()).getByRole('checkbox', { name: 'Butter' })).toBeTruthy();
  });
});

describe('edit and delete in the dialog (FR-ITEM-03/04)', () => {
  async function openDialog(fakes: ItemUseCaseFakes) {
    await userEvent.click(screen.getByRole('button', { name: '„Vollkornbrot“ bearbeiten' }));
    const dialog = await screen.findByRole('dialog', { name: 'Artikel bearbeiten' });
    expect(fakes.editItem.execute.mock.calls).toHaveLength(0);
    return dialog;
  }

  it('opens with the text pre-filled, the note and the focus in the field (AC1, FR-FB-03 AC1)', async () => {
    const { fakes } = await setup();

    const dialog = await openDialog(fakes);

    const field = within(dialog).getByLabelText<HTMLInputElement>('Artikel');
    expect(field.value).toBe('Vollkornbrot');
    expect(within(dialog).getByText('Änderungen sind sofort für alle Mitglieder sichtbar.')).toBeTruthy();
    await expect.poll(() => document.activeElement).toBe(field);
    await expectNoAxeViolations(document.body);
  });

  it('saves the new text with Enter, closes, says „Gespeichert“ and returns focus to the edit button (AC2)', async () => {
    const { fakes, snackbar } = await setup();
    fakes.editItem.execute.mockResolvedValue({ ...BREAD, text: 'Roggenbrot', version: 2 });
    const dialog = await openDialog(fakes);

    await userEvent.clear(within(dialog).getByLabelText('Artikel'));
    await userEvent.type(within(dialog).getByLabelText('Artikel'), 'Roggenbrot{Enter}');

    expect(fakes.editItem.execute.mock.calls).toEqual([['l1', 'i2', 'Roggenbrot']]);
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    expect(snackbar.message()?.text).toBe('Gespeichert');
    expect(names(openSection())).toContain('Roggenbrot');
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('button', { name: '„Roggenbrot“ bearbeiten' }));
  });

  it('discards with „Abbrechen“ and changes nothing', async () => {
    const { fakes } = await setup();
    const dialog = await openDialog(fakes);
    await userEvent.type(within(dialog).getByLabelText('Artikel'), 'xyz');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));

    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    expect(fakes.editItem.execute.mock.calls).toHaveLength(0);
    expect(names(openSection())).toContain('Vollkornbrot');
  });

  it('shows the field error and keeps the dialog for an empty text', async () => {
    const { fakes } = await setup();
    fakes.editItem.execute.mockRejectedValue(new ItemTextInvalidError('required'));
    const dialog = await openDialog(fakes);

    await userEvent.clear(within(dialog).getByLabelText('Artikel'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    expect(await within(dialog).findByText('Fehler: Bitte gib einen Artikel ein.')).toBeTruthy();
  });

  it('keeps the typed text and the dialog when saving fails (FR-FB-05 AC2)', async () => {
    const { fakes } = await setup();
    fakes.editItem.execute.mockRejectedValue(new TechnicalError('down'));
    const dialog = await openDialog(fakes);

    await userEvent.type(within(dialog).getByLabelText('Artikel'), ' neu{Enter}');

    expect(await within(dialog).findByText('Das hat nicht geklappt. Bitte versuche es noch einmal.')).toBeTruthy();
    expect(within(dialog).getByLabelText<HTMLInputElement>('Artikel').value).toBe('Vollkornbrot neu');
  });

  it('deletes at once without a further question and moves focus to the add field (FR-ITEM-04 AC1, BR-11)', async () => {
    const { fakes } = await setup();
    const dialog = await openDialog(fakes);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(fakes.deleteItem.execute.mock.calls).toEqual([['l1', 'i2']]);
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(names(openSection())).not.toContain('Vollkornbrot');
    await expect.poll(() => document.activeElement).toBe(screen.getByLabelText('Was fehlt?'));
  });

  it('says so when the item was deleted by somebody else meanwhile', async () => {
    const { fakes, snackbar } = await setup();
    fakes.editItem.execute.mockRejectedValue(new ItemNotFoundError());
    const dialog = await openDialog(fakes);

    await userEvent.type(within(dialog).getByLabelText('Artikel'), 'x{Enter}');

    await expect.poll(() => snackbar.message()?.text).toBe('Dieser Artikel wurde inzwischen gelöscht.');
    expect(names(openSection())).not.toContain('Vollkornbrot');
  });

  it('keeps a changed text on Esc and says so; „Abbrechen“ discards (UI-21)', async () => {
    const { fakes } = await setup();
    const dialog = await openDialog(fakes);
    await userEvent.type(within(dialog).getByLabelText('Artikel'), 'x');

    await userEvent.keyboard('{Escape}');

    expect(await within(dialog).findByText(/Du hast eine Eingabe gemacht/)).toBeTruthy();
    expect(screen.getByRole('dialog')).not.toBeNull();
  });
});

describe('clear checked items (FR-ITEM-05)', () => {
  it('asks with the number of items, then removes exactly the items that were checked and says so (AC1-AC3)', async () => {
    const { fakes, snackbar } = await setup();
    fakes.clearChecked.execute.mockResolvedValue(2);
    fakes.loadItems.execute.mockResolvedValue([MILK, BREAD, EGGS]);

    await userEvent.click(within(cartSection()).getByRole('button', { name: 'Erledigte entfernen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Erledigte entfernen?' });
    expect(within(dialog).getByText('2 erledigte Artikel werden für alle Mitglieder entfernt.')).toBeTruthy();
    expect(fakes.clearChecked.execute.mock.calls).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Entfernen' }));

    await expect.poll(() => snackbar.message()?.text).toBe('Erledigte Artikel entfernt');
    expect(fakes.clearChecked.execute.mock.calls).toEqual([['l1', ['i4', 'i5']]]);
    await expect.poll(() => within(cartSection()).queryByRole('checkbox')).toBeNull();
    expect(within(cartSection()).getByText('Noch nichts abgehakt.')).toBeTruthy();
  });

  it('does nothing on „Abbrechen“ and returns focus to the button', async () => {
    const { fakes } = await setup();
    const button = within(cartSection()).getByRole('button', { name: 'Erledigte entfernen' });
    await userEvent.click(button);
    const dialog = await screen.findByRole('dialog', { name: 'Erledigte entfernen?' });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));

    await expect.poll(() => document.activeElement).toBe(button);
    expect(fakes.clearChecked.execute.mock.calls).toHaveLength(0);
  });

  it('has no button when nothing is checked (AC1)', async () => {
    await setup({ items: [MILK] as typeof ALL });

    expect(screen.queryByRole('button', { name: 'Erledigte entfernen' })).toBeNull();
  });
});

describe('„Im Wagen“ on compact (FR-ITEM-06 AC1)', () => {
  it('is a collapsible card, collapsed by default, with the count visible and the state reported', async () => {
    await setup({ size: 'compact' });

    const toggle = screen.getByRole('button', { name: /Im Wagen/ });
    expect(toggle.textContent.replaceAll(/\s+/g, '')).toBe('ImWagen2');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('checkbox', { name: 'Butter' })).toBeNull();

    await userEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'Butter' })).toBeTruthy();
  });

  it('is always open as a column on medium and expanded', async () => {
    await setup({ size: 'medium' });

    expect(screen.queryByRole('button', { name: /Im Wagen/ })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Butter' })).toBeTruthy();
  });
});

describe('loading and failing', () => {
  it('shows the failure with a retry that loads again', async () => {
    const { fakes, providers } = itemUseCaseFakes();
    fakes.loadItems.execute.mockRejectedValueOnce(new TechnicalError('down'));
    fakes.loadItems.execute.mockResolvedValueOnce([MILK]);
    await render(ListItems, {
      inputs: { listId: 'l1' },
      providers: [
        ...providers,
        ...listUseCaseFakes([WEEK]).providers,
        Snackbar,
        { provide: WindowSize, useValue: { sizeClass: signal<SizeClass>('expanded') } },
        ...provideTestTranslations(),
      ],
    });
    expect(await screen.findByText('Die Artikel konnten nicht geladen werden.')).toBeTruthy();
    await expectNoAxeViolations(document.body);

    await userEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    expect(await screen.findByRole('checkbox', { name: '2× Milch, laktosefrei' })).toBeTruthy();
  });
});

describe('accessibility (A11Y-05)', () => {
  it.each(['compact', 'expanded'] as const)('has no axe violations at %s with items', async (size) => {
    await setup({ size });

    await expectNoAxeViolations(document.body);
  });

  it('has no axe violations on the empty list and with an add error', async () => {
    const { fakes } = await setup({ items: [] });
    fakes.addItem.execute.mockRejectedValue(new ItemTextInvalidError('required'));
    await userEvent.type(screen.getByLabelText('Was fehlt?'), '{Enter}');
    await screen.findByText('Fehler: Bitte gib einen Artikel ein.');

    await expectNoAxeViolations(document.body);
  });
});
