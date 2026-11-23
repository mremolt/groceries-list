import type { CurrentUser } from '../../domain/current-user';

export interface LoadCurrentUserPort {
  loadCurrentUser(signal?: AbortSignal): Promise<CurrentUser>;
}
