import { parseListName } from '../domain/list-name';
import type { ShoppingList } from '../domain/shopping-list';
import type { RenameListUseCase } from '../ports/in/rename-list-use-case';
import type { RenameListPort } from '../ports/out/rename-list-port';

export class RenameListService implements RenameListUseCase {
  constructor(private readonly port: RenameListPort) {}

  async execute(id: string, name: string): Promise<ShoppingList> {
    return this.port.renameList(id, parseListName(name));
  }
}
