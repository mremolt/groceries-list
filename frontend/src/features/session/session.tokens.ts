import { InjectionToken } from '@angular/core';

import type { CheckSignedInUseCase } from './ports/in/check-signed-in-use-case';
import type { DeleteAccountUseCase } from './ports/in/delete-account-use-case';
import type { LoadCurrentUserUseCase } from './ports/in/load-current-user-use-case';
import type { LogoutUseCase } from './ports/in/logout-use-case';
import type { UpdateDisplayNameUseCase } from './ports/in/update-display-name-use-case';
import type { CheckSignedInPort } from './ports/out/check-signed-in-port';
import type { DeleteAccountPort } from './ports/out/delete-account-port';
import type { LoadCurrentUserPort } from './ports/out/load-current-user-port';
import type { LogoutPort } from './ports/out/logout-port';
import type { UpdateDisplayNamePort } from './ports/out/update-display-name-port';

export const LOAD_CURRENT_USER_PORT = new InjectionToken<LoadCurrentUserPort>('LoadCurrentUserPort');
export const LOGOUT_PORT = new InjectionToken<LogoutPort>('LogoutPort');
export const LOAD_CURRENT_USER = new InjectionToken<LoadCurrentUserUseCase>('LoadCurrentUser');
export const LOGOUT = new InjectionToken<LogoutUseCase>('Logout');
export const CHECK_SIGNED_IN_PORT = new InjectionToken<CheckSignedInPort>('CheckSignedInPort');
export const CHECK_SIGNED_IN = new InjectionToken<CheckSignedInUseCase>('CheckSignedIn');
export const UPDATE_DISPLAY_NAME_PORT = new InjectionToken<UpdateDisplayNamePort>('UpdateDisplayNamePort');
export const DELETE_ACCOUNT_PORT = new InjectionToken<DeleteAccountPort>('DeleteAccountPort');
export const UPDATE_DISPLAY_NAME = new InjectionToken<UpdateDisplayNameUseCase>('UpdateDisplayName');
export const DELETE_ACCOUNT = new InjectionToken<DeleteAccountUseCase>('DeleteAccount');
