import { inject, type Provider } from '@angular/core';

import { HttpLists, listsHttpProviders } from './adapter/out/http/http-lists';
import { LocalStorageOpenedList } from './adapter/out/storage/local-storage-opened-list';
import { ChooseStartListService } from './application/choose-start-list-service';
import { CreateListService } from './application/create-list-service';
import { DeleteListService } from './application/delete-list-service';
import { LeaveListService } from './application/leave-list-service';
import { LoadListService } from './application/load-list-service';
import { LoadMyListsService } from './application/load-my-lists-service';
import { RememberOpenedListService } from './application/remember-opened-list-service';
import { RenameListService } from './application/rename-list-service';
import {
  CHOOSE_START_LIST,
  CREATE_LIST,
  CREATE_LIST_PORT,
  DELETE_LIST,
  DELETE_LIST_PORT,
  LEAVE_LIST,
  LEAVE_LIST_PORT,
  LOAD_LIST,
  LOAD_LIST_PORT,
  LOAD_MY_LISTS,
  LOAD_MY_LISTS_PORT,
  OPENED_LIST_MEMORY_PORT,
  REMEMBER_OPENED_LIST,
  RENAME_LIST,
  RENAME_LIST_PORT,
} from './lists.tokens';

/** Composition of the lists feature (TS-ARCH-09): adapters bound to their ports, use cases are plain classes. */
const listsProviders: Provider[] = [
  ...listsHttpProviders,
  LocalStorageOpenedList,
  { provide: LOAD_MY_LISTS_PORT, useExisting: HttpLists },
  { provide: LOAD_LIST_PORT, useExisting: HttpLists },
  { provide: CREATE_LIST_PORT, useExisting: HttpLists },
  { provide: RENAME_LIST_PORT, useExisting: HttpLists },
  { provide: DELETE_LIST_PORT, useExisting: HttpLists },
  { provide: LEAVE_LIST_PORT, useExisting: HttpLists },
  { provide: OPENED_LIST_MEMORY_PORT, useExisting: LocalStorageOpenedList },
  { provide: LOAD_MY_LISTS, useFactory: () => new LoadMyListsService(inject(LOAD_MY_LISTS_PORT)) },
  { provide: LOAD_LIST, useFactory: () => new LoadListService(inject(LOAD_LIST_PORT)) },
  { provide: CREATE_LIST, useFactory: () => new CreateListService(inject(CREATE_LIST_PORT)) },
  { provide: RENAME_LIST, useFactory: () => new RenameListService(inject(RENAME_LIST_PORT)) },
  { provide: DELETE_LIST, useFactory: () => new DeleteListService(inject(DELETE_LIST_PORT)) },
  { provide: LEAVE_LIST, useFactory: () => new LeaveListService(inject(LEAVE_LIST_PORT)) },
  { provide: CHOOSE_START_LIST, useFactory: () => new ChooseStartListService(inject(OPENED_LIST_MEMORY_PORT)) },
  { provide: REMEMBER_OPENED_LIST, useFactory: () => new RememberOpenedListService(inject(OPENED_LIST_MEMORY_PORT)) },
];

/** The published use cases of the lists feature, for features that need them (TS-ARCH-19). */
export function provideListsApi(): Provider[] {
  return listsProviders;
}
