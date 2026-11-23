import type { ItemsLoad, LoadItemsOptions } from '../../domain/items-load';

export interface LoadItemsPort {
  loadItems(listId: string, options?: LoadItemsOptions): Promise<ItemsLoad>;
}
