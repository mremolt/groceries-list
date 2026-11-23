import type { Item } from '../../domain/item';

export interface AddItemUseCase {
  execute(listId: string, text: string): Promise<Item>;
}
