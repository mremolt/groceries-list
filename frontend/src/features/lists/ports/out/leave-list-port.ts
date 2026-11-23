export interface LeaveListPort {
  leaveList(id: string): Promise<void>;
}
