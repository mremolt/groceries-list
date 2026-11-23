import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type SizeClass, WindowSize } from '@shared/ui/layout/window-size';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { provideTestAnnouncer } from '@testing/announcer';
import { BREAD, BUTTER, EGGS, itemUseCaseFakes, MILK, snapshot } from '@testing/item-use-cases';
import { listUseCaseFakes, WEEK } from '@testing/list-use-cases';
import { provideTestTranslations } from '@testing/transloco';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ItemsStore } from './items-store';
import { ListItems } from './list-items';
import { ConnectionMonitor } from './sync/connection-monitor';

async function setup() {
  const items = itemUseCaseFakes([MILK, BREAD, BUTTER]);
  const offline = signal(false);
  // explicit double: the real monitor counts 10 s of failures and is covered by its own spec
  const monitor = { offline: offline.asReadonly(), reportFailure: vi.fn(), reportSuccess: vi.fn() };
  const view = await render(ListItems, {
    inputs: { listId: 'l1' },
    providers: [
      ...items.providers,
      ...listUseCaseFakes([WEEK]).providers,
      Snackbar,
      { provide: ConnectionMonitor, useValue: monitor },
      { provide: WindowSize, useValue: { sizeClass: signal<SizeClass>('expanded') } },
      ...provideTestAnnouncer(),
      ...provideTestTranslations(),
    ],
  });
  await view.fixture.whenStable();
  await screen.findByRole('heading', { level: 2, name: /Noch zu kaufen/ });
  return {
    view,
    fakes: items.fakes,
    offline,
    /** What a background poll does when others changed the list: the store takes the new snapshot. */
    poll: async (result: ReturnType<typeof snapshot>) => {
      items.fakes.loadItems.execute.mockResolvedValue(result);
      const outcome = await TestBed.inject(ItemsStore).refresh();
      view.fixture.detectChanges();
      await view.fixture.whenStable();
      return outcome;
    },
  };
}

function row(name: string): HTMLElement {
  const element = screen.getByRole('checkbox', { name }).closest('li');
  if (!element) throw new Error(`no row for ${name}`);
  return element;
}

describe('a poll with changes by others does not disturb the person (FR-SYNC-01 AC5)', () => {
  it('keeps focus and the typed text in the add field, and adds the new item', async () => {
    const { poll } = await setup();
    const field = screen.getByLabelText<HTMLInputElement>('Was fehlt?');
    await userEvent.type(field, 'Käs');

    await poll(snapshot([MILK, BREAD, EGGS, BUTTER], '"2"'));

    expect(screen.getByRole('checkbox', { name: '6 Eier' })).toBeTruthy();
    expect(document.activeElement).toBe(field);
    expect(field.value).toBe('Käs');
  });

  it('keeps the rows of unchanged items (same elements), so focus and scroll position stay', async () => {
    const { poll } = await setup();
    const milk = row('2× Milch, laktosefrei');
    const checkbox = within(milk).getByRole('checkbox');
    checkbox.focus();

    await poll(snapshot([{ ...MILK }, BREAD, EGGS, { ...BUTTER }], '"2"'));

    expect(row('2× Milch, laktosefrei')).toBe(milk);
    expect(document.activeElement).toBe(checkbox);
  });

  it('moves an item others checked to „Im Wagen“ and updates the counts', async () => {
    const { poll } = await setup();

    await poll(snapshot([MILK, { ...BREAD, done: true, version: 2 }, BUTTER], '"2"'));

    const cart = screen.getByRole('region', { name: /Im Wagen/ });
    expect(within(cart).getByRole('checkbox', { name: 'Vollkornbrot' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: /Noch zu kaufen/ })).getByText('2 von 3 erledigt')).toBeTruthy();
  });

  it('drops an item others removed', async () => {
    const { poll } = await setup();

    await poll(snapshot([MILK, BUTTER], '"2"'));

    expect(screen.queryByRole('checkbox', { name: 'Vollkornbrot' })).toBeNull();
  });

  it('keeps an open edit dialog and what was typed in it', async () => {
    const { poll } = await setup();
    await userEvent.click(screen.getByRole('button', { name: '„Vollkornbrot“ bearbeiten' }));
    const dialog = await screen.findByRole('dialog', { name: 'Artikel bearbeiten' });
    const field = within(dialog).getByLabelText<HTMLInputElement>('Artikel');
    await userEvent.type(field, ' mit Körnern');

    await poll(snapshot([MILK, BREAD, EGGS, BUTTER], '"2"'));

    expect(screen.getByRole('dialog', { name: 'Artikel bearbeiten' })).toBe(dialog);
    expect(field.value).toBe('Vollkornbrot mit Körnern');
    expect(document.activeElement).toBe(field);
  });
});

describe('while the server cannot be reached (FR-FB-06 AC2)', () => {
  it('disables adding, checking, editing and clearing, and keeps the list readable', async () => {
    const { offline, view } = await setup();

    offline.set(true);
    view.fixture.detectChanges();
    await view.fixture.whenStable();

    for (const name of ['Hinzufügen', '„Vollkornbrot“ bearbeiten', 'Erledigte entfernen']) {
      expect(screen.getByRole('button', { name }).getAttribute('aria-disabled')).toBe('true');
    }
    expect(within(row('Vollkornbrot')).getByRole<HTMLInputElement>('checkbox').getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(screen.getByText('Vollkornbrot')).toBeTruthy();
  });

  it('does not send an item when Enter is pressed', async () => {
    const { offline, view, fakes } = await setup();
    await userEvent.type(screen.getByLabelText('Was fehlt?'), 'Käse');
    offline.set(true);
    view.fixture.detectChanges();

    await userEvent.type(screen.getByLabelText('Was fehlt?'), '{Enter}');

    expect(fakes.addItem.execute.mock.calls).toHaveLength(0);
    expect(screen.getByLabelText<HTMLInputElement>('Was fehlt?').value).toBe('Käse');
  });
});
