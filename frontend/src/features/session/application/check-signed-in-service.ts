import type { CheckSignedInUseCase } from '../ports/in/check-signed-in-use-case';
import type { CheckSignedInPort } from '../ports/out/check-signed-in-port';

export class CheckSignedInService implements CheckSignedInUseCase {
  constructor(private readonly port: CheckSignedInPort) {}

  execute(signal?: AbortSignal): Promise<boolean> {
    return this.port.isSignedIn(signal);
  }
}
