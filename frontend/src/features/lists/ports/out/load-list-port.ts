import type { ShoppingList } from '../../domain/shopping-list';

export interface LoadListPort {
  loadList(id: string, signal?: AbortSignal): Promise<ShoppingList>;
}
