import type { CurrentUser } from '../domain/current-user';
import type { LoadCurrentUserUseCase } from '../ports/in/load-current-user-use-case';
import type { LoadCurrentUserPort } from '../ports/out/load-current-user-port';

export class LoadCurrentUserService implements LoadCurrentUserUseCase {
  constructor(private readonly port: LoadCurrentUserPort) {}

  execute(signal?: AbortSignal): Promise<CurrentUser> {
    return this.port.loadCurrentUser(signal);
  }
}
