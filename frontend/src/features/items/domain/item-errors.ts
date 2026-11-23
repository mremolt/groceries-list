/** Why an item text was refused (FR-ITEM-01 AC4). */
export type ItemTextProblem = 'required' | 'tooLong';

/** The text is empty after trimming or longer than 200 characters: a validation error of the caller's input. */
export class ItemTextInvalidError extends Error {
  constructor(readonly problem: ItemTextProblem) {
    super(`invalid item text: ${problem}`);
    this.name = 'ItemTextInvalidError';
  }
}

/** The list does not exist or the person is not a member; both look the same on purpose (BR-01). */
export class ItemListNotFoundError extends Error {
  constructor() {
    super('list not found');
    this.name = 'ItemListNotFoundError';
  }
}

/** Somebody deleted the item in the meantime (FR-SYNC-02 AC3). */
export class ItemNotFoundError extends Error {
  constructor() {
    super('item not found');
    this.name = 'ItemNotFoundError';
  }
}

/** The list already has 500 items (BR-12). */
export class ItemLimitReachedError extends Error {
  constructor() {
    super('item limit reached');
    this.name = 'ItemLimitReachedError';
  }
}
