import type { Provider } from '@angular/core';
import {
  type CurrentUser,
  DELETE_ACCOUNT,
  type DeleteAccountUseCase,
  LOAD_CURRENT_USER,
  type LoadCurrentUserUseCase,
  UPDATE_DISPLAY_NAME,
  type UpdateDisplayNameUseCase,
} from '@features/session';
import { mock, type MockProxy } from 'vitest-mock-extended';

export const MARA: CurrentUser = { id: 'u1', displayName: 'Mara', email: 'mara@beispiel.de' };

/** Use-case doubles of the settings page (FR-SET-01..04), with the providers that wire the UI to them (TS-TEST-01). */
export interface SessionUseCaseFakes {
  readonly loadUser: MockProxy<LoadCurrentUserUseCase>;
  readonly updateName: MockProxy<UpdateDisplayNameUseCase>;
  readonly deleteAccount: MockProxy<DeleteAccountUseCase>;
}

export function sessionUseCaseFakes(user: CurrentUser = MARA): { fakes: SessionUseCaseFakes; providers: Provider[] } {
  const fakes: SessionUseCaseFakes = {
    loadUser: mock<LoadCurrentUserUseCase>(),
    updateName: mock<UpdateDisplayNameUseCase>(),
    deleteAccount: mock<DeleteAccountUseCase>(),
  };
  fakes.loadUser.execute.mockResolvedValue(user);
  fakes.updateName.execute.mockImplementation((displayName) => Promise.resolve({ ...user, displayName }));
  fakes.deleteAccount.execute.mockResolvedValue();
  return {
    fakes,
    providers: [
      { provide: LOAD_CURRENT_USER, useValue: fakes.loadUser },
      { provide: UPDATE_DISPLAY_NAME, useValue: fakes.updateName },
      { provide: DELETE_ACCOUNT, useValue: fakes.deleteAccount },
    ],
  };
}
