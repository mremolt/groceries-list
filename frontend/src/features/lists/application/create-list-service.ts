import { parseListName } from '../domain/list-name';
import type { ShoppingList } from '../domain/shopping-list';
import type { CreateListUseCase } from '../ports/in/create-list-use-case';
import type { CreateListPort } from '../ports/out/create-list-port';

export class CreateListService implements CreateListUseCase {
  constructor(private readonly port: CreateListPort) {}

  async execute(name: string): Promise<ShoppingList> {
    return this.port.createList(parseListName(name));
  }
}
