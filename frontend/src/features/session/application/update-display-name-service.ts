import type { CurrentUser } from '../domain/current-user';
import { parseDisplayName } from '../domain/display-name';
import type { UpdateDisplayNameUseCase } from '../ports/in/update-display-name-use-case';
import type { UpdateDisplayNamePort } from '../ports/out/update-display-name-port';

export class UpdateDisplayNameService implements UpdateDisplayNameUseCase {
  constructor(private readonly port: UpdateDisplayNamePort) {}

  async execute(displayName: string): Promise<CurrentUser> {
    return this.port.updateDisplayName(parseDisplayName(displayName));
  }
}
