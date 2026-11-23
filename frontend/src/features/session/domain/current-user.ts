/** The signed-in person as the backend knows them (FR-SET-03 later shows e-mail and name). */
export interface CurrentUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}
