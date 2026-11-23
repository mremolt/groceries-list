import { inject, type Provider } from '@angular/core';

import { HttpSession, sessionHttpProviders } from './adapter/out/http/http-session';
import { CheckSignedInService } from './application/check-signed-in-service';
import { DeleteAccountService } from './application/delete-account-service';
import { LoadCurrentUserService } from './application/load-current-user-service';
import { LogoutService } from './application/logout-service';
import { UpdateDisplayNameService } from './application/update-display-name-service';
import {
  CHECK_SIGNED_IN,
  CHECK_SIGNED_IN_PORT,
  DELETE_ACCOUNT,
  DELETE_ACCOUNT_PORT,
  LOAD_CURRENT_USER,
  LOAD_CURRENT_USER_PORT,
  LOGOUT,
  LOGOUT_PORT,
  UPDATE_DISPLAY_NAME,
  UPDATE_DISPLAY_NAME_PORT,
} from './session.tokens';

/** Composition of the session feature (TS-ARCH-09): the adapter is bound to its ports, the use cases are plain classes. */
const sessionProviders: Provider[] = [
  ...sessionHttpProviders,
  { provide: LOAD_CURRENT_USER_PORT, useExisting: HttpSession },
  { provide: LOGOUT_PORT, useExisting: HttpSession },
  { provide: CHECK_SIGNED_IN_PORT, useExisting: HttpSession },
  { provide: UPDATE_DISPLAY_NAME_PORT, useExisting: HttpSession },
  { provide: DELETE_ACCOUNT_PORT, useExisting: HttpSession },
  { provide: LOAD_CURRENT_USER, useFactory: () => new LoadCurrentUserService(inject(LOAD_CURRENT_USER_PORT)) },
  { provide: CHECK_SIGNED_IN, useFactory: () => new CheckSignedInService(inject(CHECK_SIGNED_IN_PORT)) },
  { provide: LOGOUT, useFactory: () => new LogoutService(inject(LOGOUT_PORT)) },
  { provide: UPDATE_DISPLAY_NAME, useFactory: () => new UpdateDisplayNameService(inject(UPDATE_DISPLAY_NAME_PORT)) },
  { provide: DELETE_ACCOUNT, useFactory: () => new DeleteAccountService(inject(DELETE_ACCOUNT_PORT)) },
];

/** The published use cases of the session feature, for features that need them (TS-ARCH-19). */
export function provideSessionApi(): Provider[] {
  return sessionProviders;
}
