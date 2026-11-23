import type { LogoutUseCase } from '../ports/in/logout-use-case';
import type { LogoutPort } from '../ports/out/logout-port';

export class LogoutService implements LogoutUseCase {
  constructor(private readonly port: LogoutPort) {}

  execute(): Promise<string> {
    return this.port.logout();
  }
}
