import type { ShoppingList } from '../../domain/shopping-list';

export interface CreateListUseCase {
  execute(name: string): Promise<ShoppingList>;
}
