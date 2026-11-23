import type { ShoppingList } from '../../domain/shopping-list';

export interface RenameListUseCase {
  execute(id: string, name: string): Promise<ShoppingList>;
}
