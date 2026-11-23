import type { ShareLink } from '../../domain/share-link';

export interface LoadShareLinkUseCase {
  execute(listId: string, signal?: AbortSignal): Promise<ShareLink>;
}
