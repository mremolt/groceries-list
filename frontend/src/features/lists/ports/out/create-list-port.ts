import type { ShoppingList } from '../../domain/shopping-list';

export interface CreateListPort {
  createList(name: string): Promise<ShoppingList>;
}
