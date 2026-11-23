export interface ClearCheckedItemsPort {
  clearCheckedItems(listId: string, itemIds: readonly string[]): Promise<number>;
}
