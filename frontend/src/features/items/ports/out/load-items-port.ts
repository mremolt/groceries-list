import type { Item } from '../../domain/item';

export interface LoadItemsPort {
  loadItems(listId: string, signal?: AbortSignal): Promise<readonly Item[]>;
}
