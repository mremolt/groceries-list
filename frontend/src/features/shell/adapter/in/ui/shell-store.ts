import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { TechnicalError } from '@platform/domain';
import { LOGOUT } from '@features/session';

/** View state of the app shell: only the sign-out command so far (FR-AUTH-03, UI-20). */
interface ShellState {
  readonly loggingOut: boolean;
  readonly logoutFailed: boolean;
}

const initialState: ShellState = { loggingOut: false, logoutFailed: false };

export const ShellStore = signalStore(
  withState<ShellState>(initialState),
  withMethods((store, logout = inject(LOGOUT)) => ({
    /**
     * Signs out and answers the end-session address to navigate to, or `null` when it failed or is already running.
     * The command cannot run twice at once (UI-20); only the expected technical failure is caught (TS-ARCH-23).
     */
    async logout(): Promise<string | null> {
      if (store.loggingOut()) return null;
      patchState(store, { loggingOut: true, logoutFailed: false });
      try {
        return await logout.execute();
      } catch (error) {
        if (!(error instanceof TechnicalError)) throw error;
        patchState(store, { loggingOut: false, logoutFailed: true });
        return null;
      }
    },
  })),
);
