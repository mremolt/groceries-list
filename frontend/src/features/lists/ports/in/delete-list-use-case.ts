export interface DeleteListUseCase {
  execute(id: string): Promise<void>;
}
