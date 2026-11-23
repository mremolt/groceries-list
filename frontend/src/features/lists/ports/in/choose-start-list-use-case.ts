import type { ShoppingList } from '../../domain/shopping-list';

export interface ChooseStartListUseCase {
  execute(lists: readonly ShoppingList[]): string | null;
}
