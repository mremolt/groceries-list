/** The complete link of a list, `https://‹domain›/j/‹token›` (FR-SHARE-01 AC4, NFR-SEC-05). */
export interface ShareLink {
  readonly url: string;
}

/** What a visitor may learn from a link: the list name only (FR-AUTH-06 AC4). */
export interface Invitation {
  readonly listName: string;
}

/** The list the person belongs to after a join; `alreadyMember` means nothing changed (FR-SHARE-03 AC2). */
export interface JoinedList {
  readonly listId: string;
  readonly listName: string;
  readonly alreadyMember: boolean;
}
