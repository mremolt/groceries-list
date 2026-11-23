/** One free-text line on a list (Data model 2.1, FR-ITEM-01). */
export interface Item {
  readonly id: string;
  readonly text: string;
  /** Checked: the item is „Im Wagen“ (FR-ITEM-02). */
  readonly done: boolean;
  /** ISO instant; decides the order inside a section (BR-09). */
  readonly createdAt: string;
  /** Counts the saved changes of this item; echoed by the server, never compared by the client (ADR 0007). */
  readonly version: number;
}

/** Maximum length of an item text after trimming (FR-ITEM-01 AC2). */
export const ITEM_TEXT_MAX_LENGTH = 200;
