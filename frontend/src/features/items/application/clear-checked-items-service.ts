import type { ClearCheckedItemsUseCase } from '../ports/in/clear-checked-items-use-case';
import type { ClearCheckedItemsPort } from '../ports/out/clear-checked-items-port';

export class ClearCheckedItemsService implements ClearCheckedItemsUseCase {
  constructor(private readonly port: ClearCheckedItemsPort) {}

  async execute(listId: string, itemIds: readonly string[]): Promise<number> {
    if (itemIds.length === 0) return 0; // nothing to send (FR-ITEM-05 AC4)
    return this.port.clearCheckedItems(listId, itemIds);
  }
}
