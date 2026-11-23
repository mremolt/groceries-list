/** Keeps the token on the server until the login is done, so it never sits in browser storage (ADR 0008, TS-SEC-01). */
export interface RememberInvitationUseCase {
  execute(token: string): Promise<void>;
}
