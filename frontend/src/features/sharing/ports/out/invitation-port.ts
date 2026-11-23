import type { Invitation } from '../../domain/share-link';

export interface InvitationPort {
  lookupInvitation(token: string, signal?: AbortSignal): Promise<Invitation>;
  rememberInvitation(token: string): Promise<void>;
}
