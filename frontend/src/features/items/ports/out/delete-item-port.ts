export interface DeleteItemPort {
  deleteItem(listId: string, itemId: string): Promise<void>;
}
