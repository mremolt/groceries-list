/** The link is unknown or was renewed; both look the same on purpose (FR-SHARE-04 AC2, BR-06). */
export class ShareLinkInvalidError extends Error {
  constructor() {
    super('share link invalid');
    this.name = 'ShareLinkInvalidError';
  }
}

/** Which limit stopped a join: the list has 50 members, or the person is in 100 lists (BR-12). */
export type JoinLimit = 'members' | 'lists';

export class JoinLimitReachedError extends Error {
  constructor(readonly limit: JoinLimit) {
    super(`join refused: ${limit} limit reached`);
    this.name = 'JoinLimitReachedError';
  }
}

/** The list does not exist or the person is not a member (BR-01). */
export class ShareListNotFoundError extends Error {
  constructor() {
    super('list not found');
    this.name = 'ShareListNotFoundError';
  }
}
