import { inject, type Provider } from '@angular/core';

import { HttpItems, itemsHttpProviders } from './adapter/out/http/http-items';
import { AddItemService } from './application/add-item-service';
import { ClearCheckedItemsService } from './application/clear-checked-items-service';
import { DeleteItemService } from './application/delete-item-service';
import { EditItemService } from './application/edit-item-service';
import { LoadItemsService } from './application/load-items-service';
import { SetItemDoneService } from './application/set-item-done-service';
import {
  ADD_ITEM,
  ADD_ITEM_PORT,
  CLEAR_CHECKED_ITEMS,
  CLEAR_CHECKED_ITEMS_PORT,
  DELETE_ITEM,
  DELETE_ITEM_PORT,
  EDIT_ITEM,
  LOAD_ITEMS,
  LOAD_ITEMS_PORT,
  SET_ITEM_DONE,
  UPDATE_ITEM_PORT,
} from './items.tokens';

/** Composition of the items feature (TS-ARCH-09): the adapter bound to its ports, use cases are plain classes. */
const itemsProviders: Provider[] = [
  ...itemsHttpProviders,
  { provide: LOAD_ITEMS_PORT, useExisting: HttpItems },
  { provide: ADD_ITEM_PORT, useExisting: HttpItems },
  { provide: UPDATE_ITEM_PORT, useExisting: HttpItems },
  { provide: DELETE_ITEM_PORT, useExisting: HttpItems },
  { provide: CLEAR_CHECKED_ITEMS_PORT, useExisting: HttpItems },
  { provide: LOAD_ITEMS, useFactory: () => new LoadItemsService(inject(LOAD_ITEMS_PORT)) },
  { provide: ADD_ITEM, useFactory: () => new AddItemService(inject(ADD_ITEM_PORT)) },
  { provide: EDIT_ITEM, useFactory: () => new EditItemService(inject(UPDATE_ITEM_PORT)) },
  { provide: SET_ITEM_DONE, useFactory: () => new SetItemDoneService(inject(UPDATE_ITEM_PORT)) },
  { provide: DELETE_ITEM, useFactory: () => new DeleteItemService(inject(DELETE_ITEM_PORT)) },
  { provide: CLEAR_CHECKED_ITEMS, useFactory: () => new ClearCheckedItemsService(inject(CLEAR_CHECKED_ITEMS_PORT)) },
];

/** The published use cases of the items feature, for features that need them (TS-ARCH-19). */
export function provideItemsApi(): Provider[] {
  return itemsProviders;
}
