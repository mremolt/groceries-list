import { inject } from '@angular/core';
import {
  type CurrentUser,
  DELETE_ACCOUNT,
  DisplayNameInvalidError,
  type DisplayNameProblem,
  LOAD_CURRENT_USER,
  NotAuthenticatedError,
  ReauthenticationRequiredError,
  UPDATE_DISPLAY_NAME,
} from '@features/session';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { TechnicalError } from '@platform/domain';

/** View state of the settings page (FR-SET-01..04): the person, and the two commands that run against the server. */
interface SettingsState {
  readonly user: CurrentUser | null;
  readonly status: 'loading' | 'ready' | 'failed';
  readonly saving: boolean;
  readonly deleting: boolean;
}

/** The answer of „Speichern“: the field shows the refused name's error, or the dialog/snackbar says it failed. */
export type ProfileResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: DisplayNameProblem | 'failed' };

/** The answer of the final „Konto löschen“: gone, needs a new login first (ADR 0003), or failed. */
export type DeleteAccountResult = 'deleted' | 'reauthenticate' | 'failed';

const initialState: SettingsState = { user: null, status: 'loading', saving: false, deleting: false };

export const SettingsStore = signalStore(
  withState<SettingsState>(initialState),
  withMethods(
    (
      store,
      loadUser = inject(LOAD_CURRENT_USER),
      updateName = inject(UPDATE_DISPLAY_NAME),
      remove = inject(DELETE_ACCOUNT),
    ) => ({
      async load(): Promise<void> {
        patchState(store, { status: 'loading' });
        try {
          patchState(store, { user: await loadUser.execute(), status: 'ready' });
        } catch (error) {
          // a lost session sends the whole page to the login (platform interceptor); the page only shows a failure meanwhile
          if (!(error instanceof TechnicalError || error instanceof NotAuthenticatedError)) throw error;
          patchState(store, { status: 'failed' });
        }
      },

      /** FR-SET-01: one save at a time (UI-20); the name rules live in the use case (TS-ARCH-02). */
      async saveName(name: string): Promise<ProfileResult> {
        if (store.saving()) return { ok: false, reason: 'failed' };
        patchState(store, { saving: true });
        try {
          patchState(store, { user: await updateName.execute(name) });
          return { ok: true };
        } catch (error) {
          if (error instanceof DisplayNameInvalidError) return { ok: false, reason: error.problem };
          if (!(error instanceof TechnicalError)) throw error;
          return { ok: false, reason: 'failed' };
        } finally {
          patchState(store, { saving: false });
        }
      },

      /** FR-SET-04: one delete at a time (UI-20). */
      async deleteAccount(): Promise<DeleteAccountResult> {
        if (store.deleting()) return 'failed';
        patchState(store, { deleting: true });
        try {
          await remove.execute();
          return 'deleted';
        } catch (error) {
          if (error instanceof ReauthenticationRequiredError) return 'reauthenticate';
          if (!(error instanceof TechnicalError)) throw error;
          return 'failed';
        } finally {
          patchState(store, { deleting: false });
        }
      },
    }),
  ),
);
