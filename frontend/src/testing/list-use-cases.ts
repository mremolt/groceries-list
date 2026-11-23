import type { Provider } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  CHOOSE_START_LIST,
  type ChooseStartListUseCase,
  CREATE_LIST,
  type CreateListUseCase,
  DELETE_LIST,
  type DeleteListUseCase,
  LEAVE_LIST,
  type LeaveListUseCase,
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
import { ConfirmDialogs } from '@shared/ui/dialog/confirm-dialog';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { ListActions } from '../features/shell/adapter/in/ui/list-actions';
import { ListsStore } from '../features/shell/adapter/in/ui/lists-store';

export const WEEK: ShoppingList = { id: 'l1', name: 'Wocheneinkauf', openCount: 7, revision: 3 };
export const BBQ: ShoppingList = { id: 'l2', name: 'Grillabend Samstag', openCount: 0, revision: 1 };

/** Use-case doubles of the lists feature and the providers that wire the shell's store and actions to them (TS-TEST-01). */
export interface ListUseCaseFakes {
  readonly loadMyLists: MockProxy<LoadMyListsUseCase>;
  readonly loadList: MockProxy<LoadListUseCase>;
  readonly createList: MockProxy<CreateListUseCase>;
  readonly renameList: MockProxy<RenameListUseCase>;
  readonly deleteList: MockProxy<DeleteListUseCase>;
  readonly leaveList: MockProxy<LeaveListUseCase>;
  readonly chooseStartList: MockProxy<ChooseStartListUseCase>;
  readonly rememberOpened: MockProxy<RememberOpenedListUseCase>;
}

export function listUseCaseFakes(initial: readonly ShoppingList[] = []): {
  fakes: ListUseCaseFakes;
  providers: Provider[];
} {
  const fakes: ListUseCaseFakes = {
    loadMyLists: mock<LoadMyListsUseCase>(),
    loadList: mock<LoadListUseCase>(),
    createList: mock<CreateListUseCase>(),
    renameList: mock<RenameListUseCase>(),
    deleteList: mock<DeleteListUseCase>(),
    leaveList: mock<LeaveListUseCase>(),
    chooseStartList: mock<ChooseStartListUseCase>(),
    rememberOpened: mock<RememberOpenedListUseCase>(),
  };
  fakes.loadMyLists.execute.mockResolvedValue(initial);
  fakes.chooseStartList.execute.mockReturnValue(initial[0]?.id ?? null);
  const providers: Provider[] = [
    ListsStore,
    ListActions,
    { provide: ConfirmDialogs, useFactory: (dialog: MatDialog) => new ConfirmDialogs(dialog), deps: [MatDialog] },
    { provide: LOAD_MY_LISTS, useValue: fakes.loadMyLists },
    { provide: LOAD_LIST, useValue: fakes.loadList },
    { provide: CREATE_LIST, useValue: fakes.createList },
    { provide: RENAME_LIST, useValue: fakes.renameList },
    { provide: DELETE_LIST, useValue: fakes.deleteList },
    { provide: LEAVE_LIST, useValue: fakes.leaveList },
    { provide: CHOOSE_START_LIST, useValue: fakes.chooseStartList },
    { provide: REMEMBER_OPENED_LIST, useValue: fakes.rememberOpened },
  ];
  return { fakes, providers };
}
