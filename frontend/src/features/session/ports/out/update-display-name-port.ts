import type { CurrentUser } from '../../domain/current-user';

export interface UpdateDisplayNamePort {
  updateDisplayName(displayName: string): Promise<CurrentUser>;
}
