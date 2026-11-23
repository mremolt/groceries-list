import { HttpErrorResponse } from '@angular/common/http';
import { TechnicalError } from '@platform/domain';
import { z } from 'zod';

import { ListLimitReachedError, ListNameInvalidError, ListNotFoundError } from '../../../domain/list-errors';
import type { ShoppingList } from '../../../domain/shopping-list';
import type { ListMyListsResponse } from './generated/endpoints/lists/lists.zod';

type ListDto = z.infer<typeof ListMyListsResponse>['lists'][number];

export function toShoppingList(dto: ListDto): ShoppingList {
  return { id: dto.id, name: dto.name, openCount: dto.openCount, revision: dto.revision };
}

/** The part of the RFC 9457 problem the mapper reads: the stable `code` (API-REST-07) and field errors of a 400. */
const Problem = z.object({
  code: z.string().optional(),
  errors: z.array(z.object({ field: z.string().optional(), code: z.string().optional() })).optional(),
});

/**
 * One mapper per adapter (TS-ARCH-18): HTTP failures become domain errors by status and problem `code`, everything
 * else a `TechnicalError`. A 401 is not mapped here: the platform interceptor sends the page to the login.
 */
export function toListError(error: unknown): Error {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error ? error : new TechnicalError('lists API call failed', { cause: error });
  }
  const problem = Problem.safeParse(error.error);
  const code = problem.success ? problem.data.code : undefined;
  if (error.status === 404) return new ListNotFoundError();
  if (error.status === 409 && code === 'LIST_LIMIT_REACHED') return new ListLimitReachedError();
  if (error.status === 400) {
    const codes = problem.success ? (problem.data.errors ?? []).map((entry) => entry.code) : [];
    if (codes.includes('NAME_TOO_LONG') || code === 'NAME_TOO_LONG') return new ListNameInvalidError('tooLong');
    if (codes.includes('NAME_REQUIRED') || code === 'NAME_REQUIRED') return new ListNameInvalidError('required');
  }
  return new TechnicalError(`lists API answered ${String(error.status)}`, { cause: error });
}
