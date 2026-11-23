import type { Item } from '../domain/item';
import type { SetItemDoneUseCase } from '../ports/in/set-item-done-use-case';
import type { UpdateItemPort } from '../ports/out/update-item-port';

export class SetItemDoneService implements SetItemDoneUseCase {
  constructor(private readonly port: UpdateItemPort) {}

  execute(listId: string, itemId: string, done: boolean): Promise<Item> {
    return this.port.updateItem(listId, itemId, { done });
  }
}
