import { DisplayNameInvalidError } from './session-errors';

const DISPLAY_NAME_MAX_LENGTH = 50;

/** Trims the name and checks 1-50 characters (FR-SET-01 AC1). Throws {@link DisplayNameInvalidError}. */
export function parseDisplayName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) throw new DisplayNameInvalidError('required');
  if (name.length > DISPLAY_NAME_MAX_LENGTH) throw new DisplayNameInvalidError('tooLong');
  return name;
}
