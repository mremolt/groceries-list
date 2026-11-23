import { shareToken } from '../domain/share-token';
import type { RememberInvitationUseCase } from '../ports/in/remember-invitation-use-case';
import type { InvitationPort } from '../ports/out/invitation-port';

export class RememberInvitationService implements RememberInvitationUseCase {
  constructor(private readonly port: InvitationPort) {}

  async execute(token: string): Promise<void> {
    await this.port.rememberInvitation(shareToken(token));
  }
}
