import type { ItemsLoad, LoadItemsOptions } from '../domain/items-load';
import type { LoadItemsUseCase } from '../ports/in/load-items-use-case';
import type { LoadItemsPort } from '../ports/out/load-items-port';

export class LoadItemsService implements LoadItemsUseCase {
  constructor(private readonly port: LoadItemsPort) {}

  execute(listId: string, options?: LoadItemsOptions): Promise<ItemsLoad> {
    return this.port.loadItems(listId, options);
  }
}
