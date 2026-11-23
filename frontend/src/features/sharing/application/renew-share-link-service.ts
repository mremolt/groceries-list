import type { ShareLink } from '../domain/share-link';
import type { RenewShareLinkUseCase } from '../ports/in/renew-share-link-use-case';
import type { ShareLinkPort } from '../ports/out/share-link-port';

export class RenewShareLinkService implements RenewShareLinkUseCase {
  constructor(private readonly port: ShareLinkPort) {}

  execute(listId: string): Promise<ShareLink> {
    return this.port.renewShareLink(listId);
  }
}
