import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { LOGIN_PATH, PAGE_NAVIGATION } from '../../../platform.tokens';

/**
 * A 401 from the BFF's API means the session is gone (30 days idle, logout elsewhere, back-channel logout): the whole
 * page goes to the login (NG-SEC-13 family). The target is the fixed internal login path, never a value from the
 * response (TS-SEC-03). The error still reaches the caller, which shows nothing: the page is leaving.
 */
export const unauthenticatedInterceptor: HttpInterceptorFn = (request, next) => {
  const navigation = inject(PAGE_NAVIGATION);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && request.url.startsWith('/api/')) {
        navigation.assign(LOGIN_PATH);
      }
      return throwError(() => error);
    }),
  );
};
