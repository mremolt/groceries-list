import { ITEM_TEXT_MAX_LENGTH } from './item';
import { ItemTextInvalidError } from './item-errors';

/** Trims the text and checks 1-200 characters (FR-ITEM-01 AC2/AC4). Throws {@link ItemTextInvalidError}. */
export function parseItemText(raw: string): string {
  const text = raw.trim();
  if (text.length === 0) throw new ItemTextInvalidError('required');
  if (text.length > ITEM_TEXT_MAX_LENGTH) throw new ItemTextInvalidError('tooLong');
  return text;
}
