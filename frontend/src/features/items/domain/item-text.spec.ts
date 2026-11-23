import { describe, expect, it } from 'vitest';

import { ItemTextInvalidError } from './item-errors';
import { parseItemText } from './item-text';

describe('parseItemText (FR-ITEM-01 AC2/AC4)', () => {
  it('trims the text', () => {
    expect(parseItemText('  2× Milch  ')).toBe('2× Milch');
  });

  it('refuses an empty text and one of only blanks', () => {
    expect(() => parseItemText('')).toThrow(ItemTextInvalidError);
    expect(() => parseItemText('   ')).toThrow(expect.objectContaining({ problem: 'required' }));
  });

  it('accepts 200 characters after trimming and refuses 201', () => {
    expect(parseItemText(` ${'a'.repeat(200)} `)).toHaveLength(200);
    expect(() => parseItemText('a'.repeat(201))).toThrow(expect.objectContaining({ problem: 'tooLong' }));
  });
});
