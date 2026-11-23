import type { Item } from '../../domain/item';

export interface LoadItemsUseCase {
  execute(listId: string, signal?: AbortSignal): Promise<readonly Item[]>;
}
