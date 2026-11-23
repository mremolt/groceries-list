import type { ShoppingList } from '../../domain/shopping-list';

export interface LoadMyListsUseCase {
  execute(signal?: AbortSignal): Promise<readonly ShoppingList[]>;
}
