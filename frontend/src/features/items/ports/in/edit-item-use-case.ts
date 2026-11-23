import type { Item } from '../../domain/item';

export interface EditItemUseCase {
  execute(listId: string, itemId: string, text: string): Promise<Item>;
}
