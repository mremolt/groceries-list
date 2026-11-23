import type { ShareLink } from '../../domain/share-link';

/** Makes the old link stop working; members stay (BR-06, FR-SHARE-02). */
export interface RenewShareLinkUseCase {
  execute(listId: string): Promise<ShareLink>;
}
