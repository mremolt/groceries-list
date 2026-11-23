import { ListNameInvalidError } from './list-errors';
import { LIST_NAME_MAX_LENGTH } from './shopping-list';

/** Trims the name and checks 1-80 characters (FR-LIST-01 AC3). Throws {@link ListNameInvalidError}. */
export function parseListName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) throw new ListNameInvalidError('required');
  if (name.length > LIST_NAME_MAX_LENGTH) throw new ListNameInvalidError('tooLong');
  return name;
}
