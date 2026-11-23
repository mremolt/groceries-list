/** Navigates the whole page (not the router): to the login at the BFF or to the IdP's end-session page. */
export interface PageNavigation {
  assign(url: string): void;
}
