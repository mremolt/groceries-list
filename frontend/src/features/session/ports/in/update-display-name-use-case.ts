import type { CurrentUser } from '../../domain/current-user';

/** Changes the display name of the signed-in person (FR-SET-01); rejects with `DisplayNameInvalidError`. */
export interface UpdateDisplayNameUseCase {
  execute(displayName: string): Promise<CurrentUser>;
}
