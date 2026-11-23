import type { Item } from '../../domain/item';

export interface SetItemDoneUseCase {
  execute(listId: string, itemId: string, done: boolean): Promise<Item>;
}
