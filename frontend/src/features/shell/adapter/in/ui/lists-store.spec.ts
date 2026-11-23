import { TestBed } from '@angular/core/testing';
import {
  CHOOSE_START_LIST,
  type ChooseStartListUseCase,
  CREATE_LIST,
  type CreateListUseCase,
  DELETE_LIST,
  type DeleteListUseCase,
  LEAVE_LIST,
  type LeaveListUseCase,
  ListLimitReachedError,
  ListNameInvalidError,
  ListNotFoundError,
  LOAD_LIST,
  LOAD_MY_LISTS,
  type LoadListUseCase,
  type LoadMyListsUseCase,
  REMEMBER_OPENED_LIST,
  type RememberOpenedListUseCase,
  RENAME_LIST,
  type RenameListUseCase,
  type ShoppingList,
} from '@features/lists';
import { TechnicalError } from '@platform/domain';
import { deferred } from '@testing/deferred';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ListsStore } from './lists-store';

const week: ShoppingList = { id: 'l1', name: 'Wocheneinkauf', openCount: 7, revision: 3 };
const bbq: ShoppingList = { id: 'l2', name: 'Grillabend Samstag', openCount: 0, revision: 1 };

function setup() {
  const loadMyLists = mock<LoadMyListsUseCase>();
  const loadList = mock<LoadListUseCase>();
  const createList = mock<CreateListUseCase>();
  const renameList = mock<RenameListUseCase>();
  const deleteList = mock<DeleteListUseCase>();
  const leaveList = mock<LeaveListUseCase>();
  const chooseStartList = mock<ChooseStartListUseCase>();
  const rememberOpened = mock<RememberOpenedListUseCase>();
  TestBed.configureTestingModule({
    providers: [
      ListsStore,
      { provide: LOAD_MY_LISTS, useValue: loadMyLists },
      { provide: LOAD_LIST, useValue: loadList },
      { provide: CREATE_LIST, useValue: createList },
      { provide: RENAME_LIST, useValue: renameList },
      { provide: DELETE_LIST, useValue: deleteList },
      { provide: LEAVE_LIST, useValue: leaveList },
      { provide: CHOOSE_START_LIST, useValue: chooseStartList },
      { provide: REMEMBER_OPENED_LIST, useValue: rememberOpened },
    ],
  });
  loadMyLists.execute.mockResolvedValue([week, bbq]);
  return {
    store: TestBed.inject(ListsStore),
    loadMyLists,
    loadList,
    createList,
    renameList,
    deleteList,
    leaveList,
    chooseStartList,
    rememberOpened,
  };
}

describe('ListsStore', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  describe('loading my lists', () => {
    it('loads the lists once and keeps them', async () => {
      await s.store.ensureLoaded();
      await s.store.ensureLoaded();

      expect(s.store.lists()).toEqual([week, bbq]);
      expect(s.store.status()).toBe('ready');
      expect(s.loadMyLists.execute.mock.calls).toHaveLength(1);
    });

    it('reports a failed load and tries again on the next ensureLoaded', async () => {
      s.loadMyLists.execute.mockRejectedValueOnce(new TechnicalError('down'));

      await s.store.ensureLoaded();
      expect(s.store.status()).toBe('failed');

      await s.store.ensureLoaded();
      expect(s.store.status()).toBe('ready');
    });

    it('lets a newer load win over an older one that answers later', async () => {
      const older = deferred<readonly ShoppingList[]>();
      s.loadMyLists.execute.mockReturnValueOnce(older.promise);
      const old = s.store.reload();
      s.loadMyLists.execute.mockResolvedValueOnce([bbq]);

      await s.store.reload();
      older.resolve([week]);
      await old;

      expect(s.store.lists()).toEqual([bbq]);
    });

    it('asks the use case which list to open at start', () => {
      s.chooseStartList.execute.mockReturnValue('l2');

      expect(s.store.startListId()).toBe('l2');
    });
  });

  describe('the open list', () => {
    it('shows the list and remembers it for this device', async () => {
      s.loadList.execute.mockResolvedValue(week);

      await s.store.open('l1');

      expect(s.store.currentList()).toEqual(week);
      expect(s.rememberOpened.execute.mock.calls).toEqual([['l1']]);
    });

    it('treats a list that is missing or not accessible as not found, without remembering it', async () => {
      s.loadList.execute.mockRejectedValue(new ListNotFoundError());

      await s.store.open('nope');

      expect(s.store.current()).toEqual({ status: 'notFound', id: 'nope' });
      expect(s.rememberOpened.execute.mock.calls).toHaveLength(0);
    });

    it('marks a technical failure as failed', async () => {
      s.loadList.execute.mockRejectedValue(new TechnicalError('down'));

      await s.store.open('l1');

      expect(s.store.current()).toEqual({ status: 'failed', id: 'l1' });
    });
  });

  describe('commands', () => {
    it('creates a list and refreshes the drawer', async () => {
      s.createList.execute.mockResolvedValue(bbq);

      const result = await s.store.create('Grillabend Samstag');

      expect(result).toEqual({ ok: true, list: bbq });
      expect(s.loadMyLists.execute.mock.calls).toHaveLength(1);
    });

    it.each([
      [new ListNameInvalidError('required'), 'nameRequired'],
      [new ListNameInvalidError('tooLong'), 'nameTooLong'],
      [new ListLimitReachedError(), 'limitReached'],
      [new TechnicalError('down'), 'failed'],
    ] as const)('answers %s as the expected outcome %s', async (error, reason) => {
      s.createList.execute.mockRejectedValue(error);

      expect(await s.store.create('x')).toEqual({ ok: false, reason });
    });

    it('does not let an unexpected error disappear', async () => {
      s.createList.execute.mockRejectedValue(new TypeError('bug'));

      await expect(s.store.create('x')).rejects.toThrow('bug');
      expect(s.store.busy()).toBe(false);
    });

    it('renames the open list in place', async () => {
      s.loadList.execute.mockResolvedValue(week);
      await s.store.open('l1');
      s.renameList.execute.mockResolvedValue({ ...week, name: 'Neu' });

      const result = await s.store.rename('l1', 'Neu');

      expect(result.ok).toBe(true);
      expect(s.store.currentList()?.name).toBe('Neu');
    });

    it('does not start a second command while one runs (UI-20)', async () => {
      const running = deferred<ShoppingList>();
      s.createList.execute.mockReturnValueOnce(running.promise);
      const first = s.store.create('A');

      const second = await s.store.create('B');
      running.resolve(bbq);
      await first;

      expect(second).toEqual({ ok: false, reason: 'failed' });
      expect(s.createList.execute.mock.calls).toHaveLength(1);
    });

    it('deletes and leaves a list and refreshes the drawer', async () => {
      await s.store.delete('l1');
      await s.store.leave('l2');

      expect(s.deleteList.execute.mock.calls).toEqual([['l1']]);
      expect(s.leaveList.execute.mock.calls).toEqual([['l2']]);
      expect(s.loadMyLists.execute.mock.calls).toHaveLength(2);
    });

    it('answers notFound when the list was removed meanwhile and refreshes the drawer', async () => {
      s.deleteList.execute.mockRejectedValue(new ListNotFoundError());

      expect(await s.store.delete('l1')).toEqual({ ok: false, reason: 'notFound' });
      expect(s.loadMyLists.execute.mock.calls).toHaveLength(1);
    });
  });
});
