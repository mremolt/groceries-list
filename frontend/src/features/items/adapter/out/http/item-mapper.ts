import { HttpErrorResponse } from '@angular/common/http';
import { TechnicalError } from '@platform/domain';
import { z } from 'zod';

import type { Item } from '../../../domain/item';
import {
  ItemLimitReachedError,
  ItemListNotFoundError,
  ItemNotFoundError,
  ItemTextInvalidError,
} from '../../../domain/item-errors';
import type { ListItemsResponse } from './generated/endpoints/items/items.zod';

type ItemDto = z.infer<typeof ListItemsResponse>['items'][number];

export function toItem(dto: ItemDto): Item {
  return { id: dto.id, text: dto.text, done: dto.done, createdAt: dto.createdAt, version: dto.version };
}

/** The part of the RFC 9457 problem the mapper reads: the stable `code` (API-REST-07) and field errors of a 400. */
const Problem = z.object({
  code: z.string().optional(),
  errors: z.array(z.object({ field: z.string().optional(), code: z.string().optional() })).optional(),
});

/** The 400 field errors the UI can show: the text is empty or too long (FR-ITEM-01 AC4). */
function invalidTextError(problem: z.infer<typeof Problem>): ItemTextInvalidError | undefined {
  const codes = (problem.errors ?? []).map((entry) => entry.code);
  if (codes.includes('TEXT_TOO_LONG')) return new ItemTextInvalidError('tooLong');
  if (codes.includes('TEXT_REQUIRED')) return new ItemTextInvalidError('required');
  return undefined;
}

/**
 * One mapper per adapter (TS-ARCH-18): HTTP failures become domain errors by status and problem `code`, everything
 * else a `TechnicalError`. A 401 is not mapped here: the platform interceptor sends the page to the login.
 */
export function toItemError(error: unknown): Error {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error ? error : new TechnicalError('items API call failed', { cause: error });
  }
  const problem = Problem.safeParse(error.error);
  const code = problem.success ? problem.data.code : undefined;
  if (error.status === 404) return code === 'ITEM_NOT_FOUND' ? new ItemNotFoundError() : new ItemListNotFoundError();
  if (error.status === 409 && code === 'ITEM_LIMIT_REACHED') return new ItemLimitReachedError();
  if (error.status === 400) {
    const invalid = invalidTextError(problem.success ? problem.data : {});
    if (invalid) return invalid;
  }
  return new TechnicalError(`items API answered ${String(error.status)}`, { cause: error });
}
