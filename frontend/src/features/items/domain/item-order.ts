import type { Item } from './item';

/** Both sections by `createdAt` ascending, oldest first, no manual order (BR-09); the id breaks ties. */
function byCreation(a: Item, b: Item): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/** „Noch zu kaufen“ (BR-09). */
export function openItems(items: readonly Item[]): readonly Item[] {
  return items.filter((item) => !item.done).toSorted(byCreation);
}

/** „Im Wagen“ (BR-09). */
export function checkedItems(items: readonly Item[]): readonly Item[] {
  return items.filter((item) => item.done).toSorted(byCreation);
}

/**
 * The open item that gets the focus after `id` was checked (FR-ITEM-02 AC3): the next open item, the previous one when
 * it was the last, `null` when none is left.
 */
export function focusTargetAfterChecking(items: readonly Item[], id: string): string | null {
  const open = openItems(items);
  const index = open.findIndex((item) => item.id === id);
  if (index < 0) return null;
  return (open[index + 1] ?? open[index - 1])?.id ?? null;
}
