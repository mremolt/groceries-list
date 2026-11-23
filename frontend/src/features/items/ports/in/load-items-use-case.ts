import type { ItemsLoad, LoadItemsOptions } from '../../domain/items-load';

export interface LoadItemsUseCase {
  execute(listId: string, options?: LoadItemsOptions): Promise<ItemsLoad>;
}
