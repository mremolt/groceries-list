import { describe, expect, it } from 'vitest';

import { ListNameInvalidError } from './list-errors';
import { parseListName } from './list-name';

describe('parseListName', () => {
  it('trims the name', () => {
    expect(parseListName('  Wocheneinkauf ')).toBe('Wocheneinkauf');
  });

  it('refuses an empty name after trimming', () => {
    expect(() => parseListName('   ')).toThrow(new ListNameInvalidError('required'));
  });

  it('accepts 80 characters and refuses 81', () => {
    expect(parseListName('a'.repeat(80))).toHaveLength(80);
    expect(() => parseListName('a'.repeat(81))).toThrow(new ListNameInvalidError('tooLong'));
  });

  it('counts the length after trimming', () => {
    expect(parseListName(` ${'a'.repeat(80)} `)).toHaveLength(80);
  });
});
