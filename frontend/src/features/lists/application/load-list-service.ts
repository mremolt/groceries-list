import type { ShoppingList } from '../domain/shopping-list';
import type { LoadListUseCase } from '../ports/in/load-list-use-case';
import type { LoadListPort } from '../ports/out/load-list-port';

export class LoadListService implements LoadListUseCase {
  constructor(private readonly port: LoadListPort) {}

  execute(id: string, signal?: AbortSignal): Promise<ShoppingList> {
    return this.port.loadList(id, signal);
  }
}
