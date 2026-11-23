import type { ShoppingList } from '../../domain/shopping-list';

export interface RenameListPort {
  renameList(id: string, name: string): Promise<ShoppingList>;
}
