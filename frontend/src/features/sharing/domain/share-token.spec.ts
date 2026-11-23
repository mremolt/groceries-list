import { describe, expect, it } from 'vitest';

import { shareToken } from './share-token';
import { ShareLinkInvalidError } from './sharing-errors';

const LINK_CODE = 'Kq3-vZ_0aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX';

describe('shareToken', () => {
  it('accepts the base64url text of a generated token', () => {
    expect(shareToken(LINK_CODE)).toBe(LINK_CODE);
  });

  it('trims what the address bar or a messenger adds around it', () => {
    expect(shareToken(`  ${LINK_CODE}\n`)).toBe(LINK_CODE);
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['with a slash', 'abc/def'],
    ['with a space inside', 'abc def'],
    ['too long', 'a'.repeat(65)],
  ])('refuses a token that is %s the same way as an unknown one, without a request (FR-SHARE-04 AC2)', (_name, raw) => {
    expect(() => shareToken(raw)).toThrow(ShareLinkInvalidError);
  });
});
