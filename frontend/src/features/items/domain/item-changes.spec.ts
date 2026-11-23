import { describe, expect, it } from 'vitest';

import type { Item } from './item';
import { describeChanges, reuseUnchanged } from './item-changes';

function item(id: string, text: string, done = false, version = 1): Item {
  return { id, text, done, createdAt: `2026-11-23T10:00:0${id}Z`, version };
}

const MILK = item('1', 'Milch');
const BREAD = item('2', 'Brot');
const EGGS = item('3', 'Eier');

describe('describeChanges (FR-SYNC-04)', () => {
  it('finds nothing when both snapshots are the same', () => {
    expect(describeChanges([MILK, BREAD], [MILK, BREAD])).toEqual({
      added: 0,
      removed: 0,
      checked: 0,
      unchecked: 0,
      edited: 0,
    });
  });

  it('counts new items, removed items, checked, unchecked and edited texts', () => {
    const before = [MILK, BREAD, item('4', 'Butter', true), item('5', 'Käse')];
    const after = [
      { ...MILK, done: true, version: 2 }, // checked
      { ...BREAD, text: 'Vollkornbrot', version: 2 }, // edited
      item('4', 'Butter', false, 2), // unchecked
      EGGS, // added; 'Käse' (5) removed
    ];

    expect(describeChanges(before, after)).toEqual({ added: 1, removed: 1, checked: 1, unchecked: 1, edited: 1 });
  });

  it('counts a new item that is already checked as added only', () => {
    expect(describeChanges([MILK], [MILK, item('3', 'Eier', true)])).toMatchObject({ added: 1, checked: 0 });
  });

  it('counts a text edit together with a check as both', () => {
    const changed = { ...MILK, text: 'Hafermilch', done: true, version: 3 };

    expect(describeChanges([MILK], [changed])).toMatchObject({ edited: 1, checked: 1 });
  });
});

describe('reuseUnchanged (FR-SYNC-01 AC5)', () => {
  it('keeps the old object for every item that did not change, so the view keeps its rows', () => {
    const oldMilk = MILK;
    const freshMilk = { ...MILK };
    const changedBread = { ...BREAD, done: true, version: 2 };

    const result = reuseUnchanged([oldMilk, BREAD], [freshMilk, changedBread, EGGS]);

    expect(result[0]).toBe(oldMilk);
    expect(result[1]).toBe(changedBread);
    expect(result[2]).toBe(EGGS);
  });

  it('follows the order of the new snapshot', () => {
    expect(reuseUnchanged([MILK, BREAD], [BREAD, MILK]).map((i) => i.id)).toEqual(['2', '1']);
  });
});
