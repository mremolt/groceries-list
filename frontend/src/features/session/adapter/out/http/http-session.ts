import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable, type Provider } from '@angular/core';
import { ANONYMOUS_ALLOWED, REPORT_ERROR, untilAborted } from '@platform';
import { TechnicalError } from '@platform/domain';

import type { CurrentUser } from '../../../domain/current-user';
import { NotAuthenticatedError } from '../../../domain/session-errors';
import type { CheckSignedInPort } from '../../../ports/out/check-signed-in-port';
import type { LoadCurrentUserPort } from '../../../ports/out/load-current-user-port';
import type { LogoutPort } from '../../../ports/out/logout-port';
import { MeControllerService } from './generated/endpoints/me-controller/me-controller.service';
import { GetCurrentUserResponse } from './generated/endpoints/me-controller/me-controller.zod';
import { LogoutResponse, toCurrentUser, toSessionError } from './session-mapper';

/**
 * Outgoing HTTP adapter of the session feature. `GET /api/v1/me` uses the generated client and its zod schema
 * (TS-API-05); `POST /logout` is a Spring Security endpoint of the BFF, not part of the OpenAPI spec, so it is a plain
 * `HttpClient` call here (the XSRF header comes from the platform HTTP stack, TS-SEC-10).
 */
@Injectable()
export class HttpSession implements LoadCurrentUserPort, LogoutPort, CheckSignedInPort {
  private readonly api = inject(MeControllerService);
  private readonly http = inject(HttpClient);
  private readonly reportError = inject(REPORT_ERROR);

  async loadCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
    let dto: unknown;
    try {
      dto = await untilAborted(this.api.getCurrentUser(), signal);
    } catch (error) {
      throw this.reported(toSessionError(error));
    }
    const parsed = GetCurrentUserResponse.safeParse(dto);
    if (!parsed.success) {
      throw this.reported(new TechnicalError('session API answered a malformed profile', { cause: parsed.error }));
    }
    return toCurrentUser(parsed.data);
  }

  /** `GET /api/v1/me` as a probe: a 401 means "no" here and must not send the page to the login (FR-AUTH-06). */
  async isSignedIn(signal?: AbortSignal): Promise<boolean> {
    try {
      await untilAborted(this.api.getCurrentUser({ context: new HttpContext().set(ANONYMOUS_ALLOWED, true) }), signal);
      return true;
    } catch (error) {
      const mapped = toSessionError(error);
      if (mapped instanceof NotAuthenticatedError) return false;
      throw this.reported(mapped);
    }
  }

  async logout(): Promise<string> {
    let dto: unknown;
    try {
      dto = await untilAborted(this.http.post<unknown>('/logout', null, { headers: { Accept: 'application/json' } }));
    } catch (error) {
      throw this.reported(toSessionError(error));
    }
    const parsed = LogoutResponse.safeParse(dto);
    if (!parsed.success) {
      throw this.reported(
        new TechnicalError('sign-out answered an unusable end-session address', { cause: parsed.error }),
      );
    }
    return parsed.data.redirectUri;
  }

  /** Reports a created `TechnicalError` once; no HTTP interceptor reports failed calls yet (NG-OBS-04 is open). */
  private reported(error: Error): Error {
    if (error instanceof TechnicalError) this.reportError.report(error);
    return error;
  }
}

/** The adapter and the generated service it wraps, which is not auto-provided (TS-API-04); generated code stays here. */
export const sessionHttpProviders: Provider[] = [MeControllerService, HttpSession];
