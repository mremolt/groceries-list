import type { Invitation } from '../domain/share-link';
import { shareToken } from '../domain/share-token';
import type { LookupInvitationUseCase } from '../ports/in/lookup-invitation-use-case';
import type { InvitationPort } from '../ports/out/invitation-port';

export class LookupInvitationService implements LookupInvitationUseCase {
  constructor(private readonly port: InvitationPort) {}

  async execute(token: string, signal?: AbortSignal): Promise<Invitation> {
    return await this.port.lookupInvitation(shareToken(token), signal);
  }
}
