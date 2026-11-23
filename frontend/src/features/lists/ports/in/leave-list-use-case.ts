export interface LeaveListUseCase {
  execute(id: string): Promise<void>;
}
