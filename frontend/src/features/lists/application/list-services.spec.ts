import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ListNameInvalidError } from '../domain/list-errors';
import type { ShoppingList } from '../domain/shopping-list';
import type { CreateListPort } from '../ports/out/create-list-port';
import type { DeleteListPort } from '../ports/out/delete-list-port';
import type { LeaveListPort } from '../ports/out/leave-list-port';
import type { LoadListPort } from '../ports/out/load-list-port';
import type { LoadMyListsPort } from '../ports/out/load-my-lists-port';
import type { OpenedListMemoryPort } from '../ports/out/opened-list-memory-port';
import type { RenameListPort } from '../ports/out/rename-list-port';
import { ChooseStartListService } from './choose-start-list-service';
import { CreateListService } from './create-list-service';
import { DeleteListService } from './delete-list-service';
import { LeaveListService } from './leave-list-service';
import { LoadListService } from './load-list-service';
import { LoadMyListsService } from './load-my-lists-service';
import { RememberOpenedListService } from './remember-opened-list-service';
import { RenameListService } from './rename-list-service';

const wocheneinkauf: ShoppingList = { id: 'l1', name: 'Wocheneinkauf', openCount: 3, revision: 4 };

describe('CreateListService', () => {
  it('creates the list with the trimmed name', async () => {
    const port = mock<CreateListPort>();
    port.createList.mockResolvedValue(wocheneinkauf);

    const created = await new CreateListService(port).execute('  Wocheneinkauf ');

    expect(created).toBe(wocheneinkauf);
    expect(port.createList.mock.calls).toEqual([['Wocheneinkauf']]);
  });

  it('refuses an empty name without calling the port', async () => {
    const port = mock<CreateListPort>();

    await expect(new CreateListService(port).execute('  ')).rejects.toEqual(new ListNameInvalidError('required'));

    expect(port.createList.mock.calls).toHaveLength(0);
  });
});

describe('RenameListService', () => {
  it('renames with the trimmed name', async () => {
    const port = mock<RenameListPort>();
    port.renameList.mockResolvedValue(wocheneinkauf);

    await new RenameListService(port).execute('l1', ' Neu ');

    expect(port.renameList.mock.calls).toEqual([['l1', 'Neu']]);
  });

  it('refuses a name over 80 characters', async () => {
    const port = mock<RenameListPort>();

    await expect(new RenameListService(port).execute('l1', 'x'.repeat(81))).rejects.toEqual(
      new ListNameInvalidError('tooLong'),
    );
  });
});

describe('DeleteListService and LeaveListService', () => {
  it('delete the list through the port', async () => {
    const port = mock<DeleteListPort>();
    await new DeleteListService(port).execute('l1');
    expect(port.deleteList.mock.calls).toEqual([['l1']]);
  });

  it('leave the list through the port', async () => {
    const port = mock<LeaveListPort>();
    await new LeaveListService(port).execute('l1');
    expect(port.leaveList.mock.calls).toEqual([['l1']]);
  });
});

describe('loading', () => {
  it('loads my lists and one list, passing the abort signal on', async () => {
    const mine = mock<LoadMyListsPort>();
    mine.loadMyLists.mockResolvedValue([wocheneinkauf]);
    const one = mock<LoadListPort>();
    one.loadList.mockResolvedValue(wocheneinkauf);
    const signal = new AbortController().signal;

    expect(await new LoadMyListsService(mine).execute(signal)).toEqual([wocheneinkauf]);
    expect(await new LoadListService(one).execute('l1', signal)).toBe(wocheneinkauf);
    expect(mine.loadMyLists.mock.calls).toEqual([[signal]]);
    expect(one.loadList.mock.calls).toEqual([['l1', signal]]);
  });
});

describe('start list', () => {
  it('chooses the remembered list when it exists', () => {
    const memory = mock<OpenedListMemoryPort>();
    memory.recall.mockReturnValue('l2');
    const lists = [wocheneinkauf, { ...wocheneinkauf, id: 'l2' }];

    expect(new ChooseStartListService(memory).execute(lists)).toBe('l2');
  });

  it('remembers the opened list', () => {
    const remember = vi.fn<(id: string) => void>(); // explicit fake: `expect(mock.method)` trips unbound-method (NG-TOOL-11)
    const memory: OpenedListMemoryPort = { recall: () => null, remember };

    new RememberOpenedListService(memory).execute('l1');

    expect(remember).toHaveBeenCalledExactlyOnceWith('l1');
  });
});
