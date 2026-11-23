import { ShareLinkInvalidError } from './sharing-errors';

/** 32 random bytes as base64url are 43 characters; the API allows 64 (ADR 0008). */
const SHAPE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The token of a share link as it may be sent to the API. A value of the wrong shape cannot be a token, so it is
 * refused like an unknown one and without a request (FR-SHARE-04 AC2: one answer for everything that is not valid).
 */
export function shareToken(raw: string): string {
  const token = raw.trim();
  if (!SHAPE.test(token)) throw new ShareLinkInvalidError();
  return token;
}
