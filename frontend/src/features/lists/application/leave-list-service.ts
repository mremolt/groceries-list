import type { LeaveListUseCase } from '../ports/in/leave-list-use-case';
import type { LeaveListPort } from '../ports/out/leave-list-port';

export class LeaveListService implements LeaveListUseCase {
  constructor(private readonly port: LeaveListPort) {}

  execute(id: string): Promise<void> {
    return this.port.leaveList(id);
  }
}
