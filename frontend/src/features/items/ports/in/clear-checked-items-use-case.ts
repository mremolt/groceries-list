export interface ClearCheckedItemsUseCase {
  /** Removes the given items that are still checked; answers how many were removed (FR-ITEM-05 AC4). */
  execute(listId: string, itemIds: readonly string[]): Promise<number>;
}
