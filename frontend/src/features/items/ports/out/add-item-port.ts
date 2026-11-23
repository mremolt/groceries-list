import type { Item } from '../../domain/item';

export interface AddItemPort {
  addItem(listId: string, text: string): Promise<Item>;
}
