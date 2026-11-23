import type { JoinedList } from '../domain/share-link';
import { shareToken } from '../domain/share-token';
import type { JoinListUseCase } from '../ports/in/join-list-use-case';
import type { JoinListPort } from '../ports/out/join-list-port';

export class JoinListService implements JoinListUseCase {
  constructor(private readonly port: JoinListPort) {}

  async execute(token?: string): Promise<JoinedList> {
    return await this.port.joinList(token === undefined ? undefined : shareToken(token));
  }
}
