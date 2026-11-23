import { describe, expect, it } from 'vitest';

import type { ShoppingList } from './shopping-list';
import { chooseStartListId } from './start-list';

const list = (id: string): ShoppingList => ({ id, name: id, openCount: 0, revision: 1 });

describe('chooseStartListId', () => {
  it('opens the list opened last on this device when it still exists', () => {
    expect(chooseStartListId([list('a'), list('b')], 'b')).toBe('b');
  });

  it('opens the first list when the remembered one is gone', () => {
    expect(chooseStartListId([list('a'), list('b')], 'gone')).toBe('a');
  });

  it('opens the first list when nothing was remembered', () => {
    expect(chooseStartListId([list('a')], null)).toBe('a');
  });

  it('opens nothing without lists', () => {
    expect(chooseStartListId([], 'a')).toBeNull();
  });
});
