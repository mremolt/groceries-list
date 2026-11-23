import { InjectionToken } from '@angular/core';

import type { ChooseStartListUseCase } from './ports/in/choose-start-list-use-case';
import type { CreateListUseCase } from './ports/in/create-list-use-case';
import type { DeleteListUseCase } from './ports/in/delete-list-use-case';
import type { LeaveListUseCase } from './ports/in/leave-list-use-case';
import type { LoadListUseCase } from './ports/in/load-list-use-case';
import type { LoadMyListsUseCase } from './ports/in/load-my-lists-use-case';
import type { RememberOpenedListUseCase } from './ports/in/remember-opened-list-use-case';
import type { RenameListUseCase } from './ports/in/rename-list-use-case';
import type { CreateListPort } from './ports/out/create-list-port';
import type { DeleteListPort } from './ports/out/delete-list-port';
import type { LeaveListPort } from './ports/out/leave-list-port';
import type { LoadListPort } from './ports/out/load-list-port';
import type { LoadMyListsPort } from './ports/out/load-my-lists-port';
import type { OpenedListMemoryPort } from './ports/out/opened-list-memory-port';
import type { RenameListPort } from './ports/out/rename-list-port';

export const LOAD_MY_LISTS_PORT = new InjectionToken<LoadMyListsPort>('LoadMyListsPort');
export const LOAD_LIST_PORT = new InjectionToken<LoadListPort>('LoadListPort');
export const CREATE_LIST_PORT = new InjectionToken<CreateListPort>('CreateListPort');
export const RENAME_LIST_PORT = new InjectionToken<RenameListPort>('RenameListPort');
export const DELETE_LIST_PORT = new InjectionToken<DeleteListPort>('DeleteListPort');
export const LEAVE_LIST_PORT = new InjectionToken<LeaveListPort>('LeaveListPort');
export const OPENED_LIST_MEMORY_PORT = new InjectionToken<OpenedListMemoryPort>('OpenedListMemoryPort');

export const LOAD_MY_LISTS = new InjectionToken<LoadMyListsUseCase>('LoadMyLists');
export const LOAD_LIST = new InjectionToken<LoadListUseCase>('LoadList');
export const CREATE_LIST = new InjectionToken<CreateListUseCase>('CreateList');
export const RENAME_LIST = new InjectionToken<RenameListUseCase>('RenameList');
export const DELETE_LIST = new InjectionToken<DeleteListUseCase>('DeleteList');
export const LEAVE_LIST = new InjectionToken<LeaveListUseCase>('LeaveList');
export const CHOOSE_START_LIST = new InjectionToken<ChooseStartListUseCase>('ChooseStartList');
export const REMEMBER_OPENED_LIST = new InjectionToken<RememberOpenedListUseCase>('RememberOpenedList');
