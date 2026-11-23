import type { Provider } from '@angular/core';
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
  type ItemsLoad,
  LOAD_ITEMS,
  type LoadItemsUseCase,
  SET_ITEM_DONE,
  type SetItemDoneUseCase,
} from '@features/items';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { ItemsStore } from '../features/shell/adapter/in/ui/items-store';

/** The answer of loading the items: a snapshot with the etag that names it (ADR 0006). */
export function snapshot(items: readonly Item[], etag = '"1"'): ItemsLoad {
  return { kind: 'changed', items, etag };
}

function item(id: string, text: string, createdAt: string, done = false): Item {
  return { id, text, done, createdAt, version: 1 };
}

export const MILK = item('i1', '2× Milch, laktosefrei', '2026-11-23T10:00:01Z');
export const BREAD = item('i2', 'Vollkornbrot', '2026-11-23T10:00:02Z');
export const EGGS = item('i3', '6 Eier', '2026-11-23T10:00:03Z');
export const BUTTER = item('i4', 'Butter', '2026-11-23T10:00:04Z', true);
export const YOGHURT = item('i5', 'Naturjoghurt', '2026-11-23T10:00:05Z', true);

/** Use-case doubles of the items feature and the store wired to them (TS-TEST-01). */
export interface ItemUseCaseFakes {
  readonly loadItems: MockProxy<LoadItemsUseCase>;
  readonly addItem: MockProxy<AddItemUseCase>;
  readonly editItem: MockProxy<EditItemUseCase>;
  readonly setItemDone: MockProxy<SetItemDoneUseCase>;
  readonly deleteItem: MockProxy<DeleteItemUseCase>;
  readonly clearChecked: MockProxy<ClearCheckedItemsUseCase>;
}

export function itemUseCaseFakes(initial: readonly Item[] = []): { fakes: ItemUseCaseFakes; providers: Provider[] } {
  const fakes: ItemUseCaseFakes = {
    loadItems: mock<LoadItemsUseCase>(),
    addItem: mock<AddItemUseCase>(),
    editItem: mock<EditItemUseCase>(),
    setItemDone: mock<SetItemDoneUseCase>(),
    deleteItem: mock<DeleteItemUseCase>(),
    clearChecked: mock<ClearCheckedItemsUseCase>(),
  };
  fakes.loadItems.execute.mockResolvedValue(snapshot(initial));
  const providers: Provider[] = [
    ItemsStore,
    { provide: LOAD_ITEMS, useValue: fakes.loadItems },
    { provide: ADD_ITEM, useValue: fakes.addItem },
    { provide: EDIT_ITEM, useValue: fakes.editItem },
    { provide: SET_ITEM_DONE, useValue: fakes.setItemDone },
    { provide: DELETE_ITEM, useValue: fakes.deleteItem },
    { provide: CLEAR_CHECKED_ITEMS, useValue: fakes.clearChecked },
  ];
  return { fakes, providers };
}
