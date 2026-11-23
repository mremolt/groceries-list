import type { Item } from '../domain/item';
import { parseItemText } from '../domain/item-text';
import type { EditItemUseCase } from '../ports/in/edit-item-use-case';
import type { UpdateItemPort } from '../ports/out/update-item-port';

export class EditItemService implements EditItemUseCase {
  constructor(private readonly port: UpdateItemPort) {}

  async execute(listId: string, itemId: string, text: string): Promise<Item> {
    return this.port.updateItem(listId, itemId, { text: parseItemText(text) });
  }
}
