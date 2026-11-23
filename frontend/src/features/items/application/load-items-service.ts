import type { Item } from '../domain/item';
import type { LoadItemsUseCase } from '../ports/in/load-items-use-case';
import type { LoadItemsPort } from '../ports/out/load-items-port';

export class LoadItemsService implements LoadItemsUseCase {
  constructor(private readonly port: LoadItemsPort) {}

  execute(listId: string, signal?: AbortSignal): Promise<readonly Item[]> {
    return this.port.loadItems(listId, signal);
  }
}
