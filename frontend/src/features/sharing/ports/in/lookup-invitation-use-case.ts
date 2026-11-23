import type { Invitation } from '../../domain/share-link';

/** Rejects with `ShareLinkInvalidError` for an unknown, renewed or malformed token. */
export interface LookupInvitationUseCase {
  execute(token: string, signal?: AbortSignal): Promise<Invitation>;
}
