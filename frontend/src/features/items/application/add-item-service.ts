import type { Item } from '../domain/item';
import { parseItemText } from '../domain/item-text';
import type { AddItemUseCase } from '../ports/in/add-item-use-case';
import type { AddItemPort } from '../ports/out/add-item-port';

export class AddItemService implements AddItemUseCase {
  constructor(private readonly port: AddItemPort) {}

  async execute(listId: string, text: string): Promise<Item> {
    return this.port.addItem(listId, parseItemText(text));
  }
}
