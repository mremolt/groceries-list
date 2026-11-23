import type { ShoppingList } from '../../domain/shopping-list';

export interface LoadMyListsPort {
  loadMyLists(signal?: AbortSignal): Promise<readonly ShoppingList[]>;
}
