import { HttpContextToken, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { LOGIN_PATH, PAGE_NAVIGATION } from '../../../platform.tokens';

/**
 * Set on a request whose caller handles "not signed in" itself, e.g. the join link, which shows an invitation to
 * visitors without a session instead of the login (FR-AUTH-06). Everything else still goes to the login.
 */
export const ANONYMOUS_ALLOWED = new HttpContextToken<boolean>(() => false);

/**
 * A 401 from the BFF's API means the session is gone (30 days idle, logout elsewhere, back-channel logout): the whole
 * page goes to the login (NG-SEC-13 family). The target is the fixed internal login path, never a value from the
 * response (TS-SEC-03). The error still reaches the caller, which shows nothing: the page is leaving.
 */
export const unauthenticatedInterceptor: HttpInterceptorFn = (request, next) => {
  const navigation = inject(PAGE_NAVIGATION);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        request.url.startsWith('/api/') &&
        !request.context.get(ANONYMOUS_ALLOWED)
      ) {
        navigation.assign(LOGIN_PATH);
      }
      return throwError(() => error);
    }),
  );
};
