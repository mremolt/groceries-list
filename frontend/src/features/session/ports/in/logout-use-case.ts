/** Ends the BFF session and answers the IdP end-session address the page must go to (TS-SEC-10, FR-AUTH-03). */
export interface LogoutUseCase {
  execute(): Promise<string>;
}
