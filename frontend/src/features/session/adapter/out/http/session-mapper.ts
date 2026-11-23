import { HttpErrorResponse } from '@angular/common/http';
import { TechnicalError } from '@platform/domain';
import { z } from 'zod';

import type { CurrentUser } from '../../../domain/current-user';
import { NotAuthenticatedError } from '../../../domain/session-errors';
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
