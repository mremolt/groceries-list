import type { CurrentUser } from '../../domain/current-user';

/** Answers who is signed in, or rejects with `NotAuthenticatedError`. */
export interface LoadCurrentUserUseCase {
  execute(signal?: AbortSignal): Promise<CurrentUser>;
}
