import { inject, type Provider } from '@angular/core';

import { HttpSession, sessionHttpProviders } from './adapter/out/http/http-session';
import { LoadCurrentUserService } from './application/load-current-user-service';
import { LogoutService } from './application/logout-service';
import { LOAD_CURRENT_USER, LOAD_CURRENT_USER_PORT, LOGOUT, LOGOUT_PORT } from './session.tokens';

/** Composition of the session feature (TS-ARCH-09): the adapter is bound to its ports, the use cases are plain classes. */
const sessionProviders: Provider[] = [
  ...sessionHttpProviders,
  { provide: LOAD_CURRENT_USER_PORT, useExisting: HttpSession },
  { provide: LOGOUT_PORT, useExisting: HttpSession },
  { provide: LOAD_CURRENT_USER, useFactory: () => new LoadCurrentUserService(inject(LOAD_CURRENT_USER_PORT)) },
  { provide: LOGOUT, useFactory: () => new LogoutService(inject(LOGOUT_PORT)) },
];

/** The published use cases of the session feature, for features that need them (TS-ARCH-19). */
export function provideSessionApi(): Provider[] {
  return sessionProviders;
}
