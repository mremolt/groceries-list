import type { ShareLink } from '../../domain/share-link';

export interface ShareLinkPort {
  loadShareLink(listId: string, signal?: AbortSignal): Promise<ShareLink>;
  renewShareLink(listId: string): Promise<ShareLink>;
}
