import { describe, expect, it } from 'vitest';

import { parseDisplayName } from './display-name';
import { DisplayNameInvalidError } from './session-errors';

describe('parseDisplayName', () => {
  it('trims the name', () => {
    expect(parseDisplayName('  Mara ')).toBe('Mara');
  });

  it('refuses an empty name after trimming (FR-SET-01 AC1, FR-AUTH-01 AC2)', () => {
    expect(() => parseDisplayName('   ')).toThrow(new DisplayNameInvalidError('required'));
  });

  it('accepts 50 characters and refuses 51', () => {
    expect(parseDisplayName('a'.repeat(50))).toHaveLength(50);
    expect(() => parseDisplayName('a'.repeat(51))).toThrow(new DisplayNameInvalidError('tooLong'));
  });

  it('counts the length after trimming', () => {
    expect(parseDisplayName(` ${'a'.repeat(50)} `)).toHaveLength(50);
  });
});
