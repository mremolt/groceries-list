/** Why a list name was refused (FR-LIST-01 AC3). */
export type ListNameProblem = 'required' | 'tooLong';

/** The name is empty after trimming or longer than 80 characters: a validation error of the caller's input. */
export class ListNameInvalidError extends Error {
  constructor(readonly problem: ListNameProblem) {
    super(`invalid list name: ${problem}`);
    this.name = 'ListNameInvalidError';
  }
}

/** The list does not exist or the person is not a member; both look the same on purpose (FR-NAV-06 AC2, BR-01). */
export class ListNotFoundError extends Error {
  constructor() {
    super('list not found');
    this.name = 'ListNotFoundError';
  }
}

/** The person is already a member of 100 lists (BR-12). */
export class ListLimitReachedError extends Error {
  constructor() {
    super('list limit reached');
    this.name = 'ListLimitReachedError';
  }
}
