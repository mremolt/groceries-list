import type { ShoppingList } from './shopping-list';

/**
 * The list the app opens at start (FR-NAV-03 AC1): the one opened last on this device when it still exists, otherwise
 * the first in the order of BR-10, otherwise none.
 */
export function chooseStartListId(lists: readonly ShoppingList[], remembered: string | null): string | null {
  const known = remembered !== null && lists.some((list) => list.id === remembered);
  return known ? remembered : (lists[0]?.id ?? null);
}
