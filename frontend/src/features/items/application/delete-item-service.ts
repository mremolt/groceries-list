import type { DeleteItemUseCase } from '../ports/in/delete-item-use-case';
import type { DeleteItemPort } from '../ports/out/delete-item-port';

export class DeleteItemService implements DeleteItemUseCase {
  constructor(private readonly port: DeleteItemPort) {}

  execute(listId: string, itemId: string): Promise<void> {
    return this.port.deleteItem(listId, itemId);
  }
}
