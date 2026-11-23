import type { JoinedList } from '../../domain/share-link';

export interface JoinListPort {
  /** `token` is absent for the one the server remembered. */
  joinList(token?: string): Promise<JoinedList>;
}
