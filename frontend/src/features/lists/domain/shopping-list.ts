/** A grocery list as the person sees it in the navigation (BR-10 order is the order of the API answer). */
export interface ShoppingList {
  readonly id: string;
  readonly name: string;
  /** Number of open (unchecked) items (FR-LIST-05). */
  readonly openCount: number;
  /** Changes with every change of the list or its items (ADR 0006); the sync token of M5. */
  readonly revision: number;
}

/** Maximum length of a list name after trimming (Data model 2.1). */
export const LIST_NAME_MAX_LENGTH = 80;
