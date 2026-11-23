export interface LogoutPort {
  /** Posts the sign-out to the BFF; resolves with the validated end-session address. */
  logout(): Promise<string>;
}
