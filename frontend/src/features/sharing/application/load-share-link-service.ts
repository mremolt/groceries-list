import type { ShareLink } from '../domain/share-link';
import type { LoadShareLinkUseCase } from '../ports/in/load-share-link-use-case';
import type { ShareLinkPort } from '../ports/out/share-link-port';

export class LoadShareLinkService implements LoadShareLinkUseCase {
  constructor(private readonly port: ShareLinkPort) {}

  execute(listId: string, signal?: AbortSignal): Promise<ShareLink> {
    return this.port.loadShareLink(listId, signal);
  }
}
