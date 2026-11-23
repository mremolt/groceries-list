/**
 * Deletes the signed-in person's account (FR-SET-04); rejects with `ReauthenticationRequiredError` when the identity
 * provider has not confirmed the password recently (ADR 0003).
 */
export interface DeleteAccountUseCase {
  execute(): Promise<void>;
}
