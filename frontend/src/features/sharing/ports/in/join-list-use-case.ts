import type { JoinedList } from '../../domain/share-link';

/** Without a token the one remembered by the server before the login is used (FR-AUTH-06 AC3). */
export interface JoinListUseCase {
  execute(token?: string): Promise<JoinedList>;
}
