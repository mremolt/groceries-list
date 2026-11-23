import type { DeleteAccountUseCase } from '../ports/in/delete-account-use-case';
import type { DeleteAccountPort } from '../ports/out/delete-account-port';

export class DeleteAccountService implements DeleteAccountUseCase {
  constructor(private readonly port: DeleteAccountPort) {}

  execute(): Promise<void> {
    return this.port.deleteAccount();
  }
}
