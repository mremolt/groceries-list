/**
 * Answers whether a session exists, without sending the page to the login when it does not. For pages that show
 * something to visitors without a session (the invitation page, FR-AUTH-06).
 */
export interface CheckSignedInUseCase {
  execute(signal?: AbortSignal): Promise<boolean>;
}
