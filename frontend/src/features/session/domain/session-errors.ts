/** There is no valid session: the BFF answered 401. The whole page goes to the login. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super('not authenticated');
    this.name = 'NotAuthenticatedError';
  }
}

/** Why a display name was refused (FR-SET-01 AC1, rules as FR-AUTH-01 AC2). */
export type DisplayNameProblem = 'required' | 'tooLong';

/** The name is empty after trimming or longer than 50 characters: a validation error of the caller's input. */
export class DisplayNameInvalidError extends Error {
  constructor(readonly problem: DisplayNameProblem) {
    super(`invalid display name: ${problem}`);
    this.name = 'DisplayNameInvalidError';
  }
}

/** The identity provider has not confirmed the password recently: deleting the account needs a new login (ADR 0003). */
export class ReauthenticationRequiredError extends Error {
  constructor() {
    super('re-authentication required');
    this.name = 'ReauthenticationRequiredError';
  }
}
