import { HttpErrorResponse } from '@angular/common/http';
import { TechnicalError } from '@platform/domain';
import { z } from 'zod';

import type { CurrentUser } from '../../../domain/current-user';
import {
  DisplayNameInvalidError,
  NotAuthenticatedError,
  ReauthenticationRequiredError,
} from '../../../domain/session-errors';
import type { GetCurrentUserResponse } from './generated/endpoints/me-controller/me-controller.zod';

/** One mapper per adapter (TS-ARCH-18): HTTP failures become domain errors, everything else a `TechnicalError`. */
export function toSessionError(error: unknown): Error {
  if (error instanceof HttpErrorResponse && error.status === 401) {
    return new NotAuthenticatedError();
  }
  if (error instanceof HttpErrorResponse) {
    return new TechnicalError(`session API answered ${String(error.status)}`, { cause: error });
  }
  return error instanceof Error ? error : new TechnicalError('session API call failed', { cause: error });
}

/** The part of the RFC 9457 problem the mapper reads: the stable `code` (API-REST-07) and field errors of a 400. */
const Problem = z.object({
  code: z.string().optional(),
  errors: z.array(z.object({ field: z.string().optional(), code: z.string().optional() })).optional(),
});

/**
 * Failures of `PATCH` and `DELETE /api/v1/me` by status and problem `code`: a refused name (FR-SET-01) and a missing
 * recent login (ADR 0003) are domain errors; everything else is the plain session mapping.
 */
export function toProfileError(error: unknown): Error {
  if (error instanceof HttpErrorResponse) {
    const problem = Problem.safeParse(error.error);
    if (error.status === 403 && problem.success && problem.data.code === 'REAUTH_REQUIRED') {
      return new ReauthenticationRequiredError();
    }
    const invalid = error.status === 400 && problem.success ? toDisplayNameError(problem.data.errors ?? []) : null;
    if (invalid) return invalid;
  }
  return toSessionError(error);
}

function toDisplayNameError(errors: readonly { code?: string | undefined }[]): DisplayNameInvalidError | null {
  const codes = errors.map((entry) => entry.code);
  if (codes.includes('DISPLAY_NAME_TOO_LONG')) return new DisplayNameInvalidError('tooLong');
  if (codes.includes('DISPLAY_NAME_REQUIRED')) return new DisplayNameInvalidError('required');
  return null;
}

export function toCurrentUser(dto: z.infer<typeof GetCurrentUserResponse>): CurrentUser {
  return { id: dto.id, displayName: dto.displayName, email: dto.email };
}

/** An `https` end-session address; `http` only for a local IdP (TS-SEC-10, TS-SEC-03). */
function isAllowedEndSessionUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname.endsWith('.localhost'));
}

/** The BFF's sign-out answer (SPRING-SEC-33): the IdP end-session address as JSON. */
export const LogoutResponse = z.object({ redirectUri: z.url().refine(isAllowedEndSessionUrl) });
