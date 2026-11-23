import { HttpErrorResponse } from '@angular/common/http';
import { TechnicalError } from '@platform/domain';
import { z } from 'zod';

import { JoinLimitReachedError, ShareLinkInvalidError, ShareListNotFoundError } from '../../../domain/sharing-errors';

/** The part of the RFC 9457 problem the mapper reads: the stable `code` (API-REST-07). */
const Problem = z.object({ code: z.string().optional() });

type Operation = 'shareLink' | 'invitation' | 'join';

/**
 * One mapper per adapter (TS-ARCH-18): HTTP failures become domain errors by status and problem `code`, everything
 * else (429, 5xx, a malformed body) a `TechnicalError`. A 401 is not mapped here: the platform interceptor sends the
 * page to the login.
 */
export function toSharingError(error: unknown, operation: Operation): Error {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error ? error : new TechnicalError('sharing API call failed', { cause: error });
  }
  const problem = Problem.safeParse(error.error);
  const code = problem.success ? problem.data.code : undefined;
  if (error.status === 404) {
    return operation === 'shareLink' ? new ShareListNotFoundError() : new ShareLinkInvalidError();
  }
  if (operation === 'join' && error.status === 409) {
    if (code === 'MEMBER_LIMIT_REACHED') return new JoinLimitReachedError('members');
    if (code === 'LIST_LIMIT_REACHED') return new JoinLimitReachedError('lists');
  }
  return new TechnicalError(`sharing API answered ${String(error.status)}`, { cause: error });
}
