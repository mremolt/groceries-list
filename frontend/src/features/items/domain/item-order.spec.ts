import { describe, expect, it } from 'vitest';

import type { Item } from './item';
import { checkedItems, focusTargetAfterChecking, openItems } from './item-order';

function item(id: string, createdAt: string, done = false): Item {
  return { id, text: id, done, createdAt, version: 1 };
}

const ITEMS = [
  item('c', '2026-11-23T10:00:03Z'),
  item('a', '2026-11-23T10:00:01Z'),
  item('x', '2026-11-23T10:00:02Z', true),
  item('b', '2026-11-23T10:00:02Z'),
  item('w', '2026-11-23T10:00:00Z', true),
];

describe('item order (BR-09)', () => {
  it('lists the open items oldest first', () => {
    expect(openItems(ITEMS).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('lists the checked items oldest first, so an unchecked item returns to its position', () => {
    expect(checkedItems(ITEMS).map((i) => i.id)).toEqual(['w', 'x']);
  });

  it('breaks ties by id for a stable order', () => {
    const tied = [item('b', 't'), item('a', 't')];
    expect(openItems(tied).map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('focusTargetAfterChecking (FR-ITEM-02 AC3)', () => {
  it('is the next open item', () => {
    expect(focusTargetAfterChecking(ITEMS, 'a')).toBe('b');
  });

  it('is the previous open item when the last one was checked', () => {
    expect(focusTargetAfterChecking(ITEMS, 'c')).toBe('b');
  });

  it('is null when no open item is left or the item is not open', () => {
    expect(focusTargetAfterChecking([item('a', 't')], 'a')).toBeNull();
    expect(focusTargetAfterChecking(ITEMS, 'x')).toBeNull();
  });
});
