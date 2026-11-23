import type { ShoppingList } from '../../domain/shopping-list';

export interface LoadListUseCase {
  execute(id: string, signal?: AbortSignal): Promise<ShoppingList>;
}
