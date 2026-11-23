import { TestBed } from '@angular/core/testing';
import {
  ADD_ITEM,
  type AddItemUseCase,
  CLEAR_CHECKED_ITEMS,
  type ClearCheckedItemsUseCase,
  DELETE_ITEM,
  type DeleteItemUseCase,
  EDIT_ITEM,
  type EditItemUseCase,
  type Item,
  ItemLimitReachedError,
  ItemListNotFoundError,
  ItemNotFoundError,
  ItemTextInvalidError,
  LOAD_ITEMS,
  type LoadItemsUseCase,
  SET_ITEM_DONE,
  type SetItemDoneUseCase,
} from '@features/items';
import { TechnicalError } from '@platform/domain';
import { deferred } from '@testing/deferred';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ItemsStore } from './items-store';

function item(id: string, createdAt: string, done = false): Item {
  return { id, text: `Artikel ${id}`, done, createdAt, version: 1 };
}
const A = item('a', '2026-11-23T10:00:01Z');
const B = item('b', '2026-11-23T10:00:02Z');
const C = item('c', '2026-11-23T10:00:03Z', true);

function setup(initial: readonly Item[] = [A, B, C]) {
  const fakes = {
    load: mock<LoadItemsUseCase>(),
    add: mock<AddItemUseCase>(),
    edit: mock<EditItemUseCase>(),
    setDone: mock<SetItemDoneUseCase>(),
    remove: mock<DeleteItemUseCase>(),
    clear: mock<ClearCheckedItemsUseCase>(),
  };
  fakes.load.execute.mockResolvedValue(initial);
  TestBed.configureTestingModule({
    providers: [
      ItemsStore,
      { provide: LOAD_ITEMS, useValue: fakes.load },
      { provide: ADD_ITEM, useValue: fakes.add },
      { provide: EDIT_ITEM, useValue: fakes.edit },
      { provide: SET_ITEM_DONE, useValue: fakes.setDone },
      { provide: DELETE_ITEM, useValue: fakes.remove },
      { provide: CLEAR_CHECKED_ITEMS, useValue: fakes.clear },
    ],
  });
  return { store: TestBed.inject(ItemsStore), ...fakes };
}

async function loaded(initial?: readonly Item[]) {
  const context = setup(initial);
  await context.store.load('l1');
  return context;
}

describe('ItemsStore loading', () => {
  it('splits the items into the two sections of BR-09 and counts them (FR-ITEM-02 AC4)', async () => {
    const { store } = await loaded();

    expect(store.status()).toBe('ready');
    expect(store.open().map((i) => i.id)).toEqual(['a', 'b']);
    expect(store.checked().map((i) => i.id)).toEqual(['c']);
    expect([store.openCount(), store.checkedCount(), store.total()]).toEqual([2, 1, 3]);
  });

  it('is loading first and forgets the items of the previous list', async () => {
    const { store, load } = setup();
    await store.load('l1');
    const pending = deferred<readonly Item[]>();
    load.execute.mockReturnValue(pending.promise);

    const second = store.load('l2');

    expect(store.status()).toBe('loading');
    expect(store.items()).toEqual([]);
    pending.resolve([B]);
    await second;
    expect(store.items()).toEqual([B]);
  });

  it('lets the latest load win (NG-STATE-18)', async () => {
    const { store, load } = setup();
    const slow = deferred<readonly Item[]>();
    load.execute.mockReturnValueOnce(slow.promise);
    load.execute.mockResolvedValueOnce([B]);

    const first = store.load('l1');
    await store.load('l2');
    slow.resolve([A]);
    await first;

    expect(store.items()).toEqual([B]);
  });

  it('shows notFound for a list without access and failed for a technical error', async () => {
    const { store, load } = setup();
    load.execute.mockRejectedValueOnce(new ItemListNotFoundError());
    await store.load('l1');
    expect(store.status()).toBe('notFound');

    load.execute.mockRejectedValueOnce(new TechnicalError('boom'));
    await store.load('l1');
    expect(store.status()).toBe('failed');
  });
});

describe('ItemsStore add (FR-ITEM-01)', () => {
  it('appends the saved item to the open section', async () => {
    const { store, add } = await loaded();
    const created = item('d', '2026-11-23T10:00:04Z');
    add.execute.mockResolvedValue(created);

    expect(await store.add('Artikel d')).toEqual({ ok: true });

    expect(add.execute.mock.calls).toEqual([['l1', 'Artikel d']]);
    expect(store.open().map((i) => i.id)).toEqual(['a', 'b', 'd']);
  });

  it.each([
    [new ItemTextInvalidError('required'), 'textRequired'],
    [new ItemTextInvalidError('tooLong'), 'textTooLong'],
    [new ItemLimitReachedError(), 'limitReached'],
    [new TechnicalError('x'), 'failed'],
  ] as const)('answers %s as the expected outcome %s and changes nothing', async (error, reason) => {
    const { store, add } = await loaded();
    add.execute.mockRejectedValue(error);

    expect(await store.add('x')).toEqual({ ok: false, reason });
    expect(store.items()).toHaveLength(3);
  });

  it('refuses a second add while one is running', async () => {
    const { store, add } = await loaded();
    const pending = deferred<Item>();
    add.execute.mockReturnValue(pending.promise);

    const first = store.add('Brot');
    expect(await store.add('Brot')).toEqual({ ok: false, reason: 'busy' });
    pending.resolve(item('d', '2026-11-23T10:00:04Z'));
    await first;

    expect(add.execute.mock.calls).toHaveLength(1);
  });
});

describe('ItemsStore setDone (FR-ITEM-02)', () => {
  it('moves the item at once, before the server answered (NFR-PERF-02)', async () => {
    const { store, setDone } = await loaded();
    const pending = deferred<Item>();
    setDone.execute.mockReturnValue(pending.promise);

    const saving = store.setDone('a', true);

    expect(store.checked().map((i) => i.id)).toEqual(['a', 'c']);
    expect(store.openCount()).toBe(1);
    pending.resolve({ ...A, done: true, version: 2 });
    expect(await saving).toEqual({ ok: true });
    expect(setDone.execute.mock.calls).toEqual([['l1', 'a', true]]);
    expect(store.items().find((i) => i.id === 'a')?.version).toBe(2);
  });

  it('puts an unchecked item back at its position per BR-09', async () => {
    const { store, setDone } = await loaded();
    setDone.execute.mockResolvedValue({ ...C, done: false });

    await store.setDone('c', false);

    expect(store.open().map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('undoes the change when saving fails (FR-ITEM-02 AC2, FR-FB-05 AC1)', async () => {
    const { store, setDone } = await loaded();
    setDone.execute.mockRejectedValue(new TechnicalError('down'));

    expect(await store.setDone('a', true)).toEqual({ ok: false, reason: 'failed' });

    expect(store.open().map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('drops an item somebody deleted in the meantime and says so (FR-SYNC-02 AC3)', async () => {
    const { store, setDone } = await loaded();
    setDone.execute.mockRejectedValue(new ItemNotFoundError());

    expect(await store.setDone('a', true)).toEqual({ ok: false, reason: 'gone' });

    expect(store.items().map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('saves the changes of one item in the order they were made (NG-STATE-18)', async () => {
    const { store, setDone } = await loaded();
    const first = deferred<Item>();
    setDone.execute.mockReturnValueOnce(first.promise);
    setDone.execute.mockResolvedValueOnce({ ...A, done: false, version: 3 });

    const checking = store.setDone('a', true);
    const unchecking = store.setDone('a', false);
    await new Promise<void>((resolve) => setTimeout(resolve));
    expect(setDone.execute.mock.calls).toHaveLength(1);
    first.resolve({ ...A, done: true, version: 2 });
    await Promise.all([checking, unchecking]);

    expect(setDone.execute.mock.calls.map((call) => call[2])).toEqual([true, false]);
    expect(store.open().map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('ItemsStore edit and remove (FR-ITEM-03/04)', () => {
  it('replaces the item with the saved one', async () => {
    const { store, edit } = await loaded();
    edit.execute.mockResolvedValue({ ...A, text: 'Hafermilch', version: 2 });

    expect(await store.edit('a', 'Hafermilch')).toEqual({ ok: true });

    expect(store.items().find((i) => i.id === 'a')?.text).toBe('Hafermilch');
    expect(edit.execute.mock.calls).toEqual([['l1', 'a', 'Hafermilch']]);
  });

  it('answers a refused text and keeps the old one', async () => {
    const { store, edit } = await loaded();
    edit.execute.mockRejectedValue(new ItemTextInvalidError('tooLong'));

    expect(await store.edit('a', 'x')).toEqual({ ok: false, reason: 'textTooLong' });
    expect(store.items().find((i) => i.id === 'a')?.text).toBe('Artikel a');
  });

  it('removes an item that is gone from the screen when editing it fails with 404', async () => {
    const { store, edit } = await loaded();
    edit.execute.mockRejectedValue(new ItemNotFoundError());

    expect(await store.edit('a', 'x')).toEqual({ ok: false, reason: 'gone' });
    expect(store.items().map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('deletes the item without a further question (BR-11)', async () => {
    const { store, remove } = await loaded();

    expect(await store.remove('a')).toEqual({ ok: true });

    expect(remove.execute.mock.calls).toEqual([['l1', 'a']]);
    expect(store.items().map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('keeps the item when deleting fails', async () => {
    const { store, remove } = await loaded();
    remove.execute.mockRejectedValue(new TechnicalError('down'));

    expect(await store.remove('a')).toEqual({ ok: false, reason: 'failed' });
    expect(store.items()).toHaveLength(3);
  });
});

describe('ItemsStore clearChecked (FR-ITEM-05)', () => {
  it('sends only the ids it was given and reloads what the server has afterwards (AC4)', async () => {
    const { store, clear, load } = await loaded();
    clear.execute.mockResolvedValue(1);
    load.execute.mockResolvedValue([A, B]);

    expect(await store.clearChecked(['c'])).toEqual({ ok: true, removed: 1 });

    expect(clear.execute.mock.calls).toEqual([['l1', ['c']]]);
    expect(store.items().map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('keeps the items and answers failed when the server fails', async () => {
    const { store, clear } = await loaded();
    clear.execute.mockRejectedValue(new TechnicalError('down'));

    expect(await store.clearChecked(['c'])).toEqual({ ok: false, reason: 'failed' });
    expect(store.checked()).toHaveLength(1);
  });
});
