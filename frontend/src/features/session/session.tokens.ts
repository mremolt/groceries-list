import { InjectionToken } from '@angular/core';

import type { CheckSignedInUseCase } from './ports/in/check-signed-in-use-case';
import type { LoadCurrentUserUseCase } from './ports/in/load-current-user-use-case';
import type { LogoutUseCase } from './ports/in/logout-use-case';
import type { CheckSignedInPort } from './ports/out/check-signed-in-port';
import type { LoadCurrentUserPort } from './ports/out/load-current-user-port';
import type { LogoutPort } from './ports/out/logout-port';

export const LOAD_CURRENT_USER_PORT = new InjectionToken<LoadCurrentUserPort>('LoadCurrentUserPort');
export const LOGOUT_PORT = new InjectionToken<LogoutPort>('LogoutPort');
export const LOAD_CURRENT_USER = new InjectionToken<LoadCurrentUserUseCase>('LoadCurrentUser');
export const LOGOUT = new InjectionToken<LogoutUseCase>('Logout');
export const CHECK_SIGNED_IN_PORT = new InjectionToken<CheckSignedInPort>('CheckSignedInPort');
export const CHECK_SIGNED_IN = new InjectionToken<CheckSignedInUseCase>('CheckSignedIn');
