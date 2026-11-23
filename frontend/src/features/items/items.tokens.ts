import { InjectionToken } from '@angular/core';

import type { AddItemUseCase } from './ports/in/add-item-use-case';
import type { ClearCheckedItemsUseCase } from './ports/in/clear-checked-items-use-case';
import type { DeleteItemUseCase } from './ports/in/delete-item-use-case';
import type { EditItemUseCase } from './ports/in/edit-item-use-case';
import type { LoadItemsUseCase } from './ports/in/load-items-use-case';
import type { SetItemDoneUseCase } from './ports/in/set-item-done-use-case';
import type { AddItemPort } from './ports/out/add-item-port';
import type { ClearCheckedItemsPort } from './ports/out/clear-checked-items-port';
import type { DeleteItemPort } from './ports/out/delete-item-port';
import type { LoadItemsPort } from './ports/out/load-items-port';
import type { UpdateItemPort } from './ports/out/update-item-port';

export const LOAD_ITEMS_PORT = new InjectionToken<LoadItemsPort>('LoadItemsPort');
export const ADD_ITEM_PORT = new InjectionToken<AddItemPort>('AddItemPort');
export const UPDATE_ITEM_PORT = new InjectionToken<UpdateItemPort>('UpdateItemPort');
export const DELETE_ITEM_PORT = new InjectionToken<DeleteItemPort>('DeleteItemPort');
export const CLEAR_CHECKED_ITEMS_PORT = new InjectionToken<ClearCheckedItemsPort>('ClearCheckedItemsPort');

export const LOAD_ITEMS = new InjectionToken<LoadItemsUseCase>('LoadItems');
export const ADD_ITEM = new InjectionToken<AddItemUseCase>('AddItem');
export const EDIT_ITEM = new InjectionToken<EditItemUseCase>('EditItem');
export const SET_ITEM_DONE = new InjectionToken<SetItemDoneUseCase>('SetItemDone');
export const DELETE_ITEM = new InjectionToken<DeleteItemUseCase>('DeleteItem');
export const CLEAR_CHECKED_ITEMS = new InjectionToken<ClearCheckedItemsUseCase>('ClearCheckedItems');
