export interface DeleteItemUseCase {
  execute(listId: string, itemId: string): Promise<void>;
}
