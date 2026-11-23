import type { ShoppingList } from '../domain/shopping-list';
import type { LoadMyListsUseCase } from '../ports/in/load-my-lists-use-case';
import type { LoadMyListsPort } from '../ports/out/load-my-lists-port';

export class LoadMyListsService implements LoadMyListsUseCase {
  constructor(private readonly port: LoadMyListsPort) {}

  execute(signal?: AbortSignal): Promise<readonly ShoppingList[]> {
    return this.port.loadMyLists(signal);
  }
}
