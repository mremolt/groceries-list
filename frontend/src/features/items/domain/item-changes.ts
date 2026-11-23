import type { Item } from './item';

/** What others changed between two snapshots of a list, counted for the announcement (FR-SYNC-04). */
export interface ItemChanges {
  readonly added: number;
  readonly removed: number;
  readonly checked: number;
  readonly unchecked: number;
  readonly edited: number;
}

/** True when nothing differs: no announcement is made. */
export function hasChanges(changes: ItemChanges): boolean {
  return Object.values(changes).some((count) => count > 0);
}

/** Compares by id. A new item counts as added only, whatever its state is. */
export function describeChanges(before: readonly Item[], after: readonly Item[]): ItemChanges {
  const previous = new Map(before.map((item) => [item.id, item]));
  const current = new Set(after.map((item) => item.id));
  let added = 0;
  let checked = 0;
  let unchecked = 0;
  let edited = 0;
  for (const item of after) {
    const old = previous.get(item.id);
    if (!old) {
      added += 1;
      continue;
    }
    if (!old.done && item.done) checked += 1;
    if (old.done && !item.done) unchecked += 1;
    if (old.text !== item.text) edited += 1;
  }
  const removed = before.filter((item) => !current.has(item.id)).length;
  return { added, removed, checked, unchecked, edited };
}

function same(a: Item, b: Item): boolean {
  return a.text === b.text && a.done === b.done && a.version === b.version && a.createdAt === b.createdAt;
}

/**
 * The new snapshot, but with the old object for every item that did not change. The view tracks rows by id and
 * re-renders only changed objects, so focus, scroll position and open controls stay (FR-SYNC-01 AC5).
 */
export function reuseUnchanged(before: readonly Item[], after: readonly Item[]): readonly Item[] {
  const previous = new Map(before.map((item) => [item.id, item]));
  return after.map((item) => {
    const old = previous.get(item.id);
    return old && same(old, item) ? old : item;
  });
}
