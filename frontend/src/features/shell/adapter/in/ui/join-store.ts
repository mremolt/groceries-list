import { inject } from '@angular/core';
import { CHECK_SIGNED_IN } from '@features/session';
import {
  JOIN_LIST,
  type JoinedList,
  JoinLimitReachedError,
  LOOKUP_INVITATION,
  REMEMBER_INVITATION,
  ShareLinkInvalidError,
} from '@features/sharing';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { TechnicalError } from '@platform/domain';

/** What the join page shows (FR-SHARE-03, FR-SHARE-04, FR-AUTH-06). */
export type JoinPhase =
  'checking' | 'invitation' | 'joining' | 'joined' | 'invalid' | 'memberLimit' | 'listLimit' | 'failed';

interface JoinState {
  readonly phase: JoinPhase;
  /** Whether a session exists; decides the button of the invalid-link page (FR-SHARE-04 AC1). `null` until known. */
  readonly signedIn: boolean | null;
  /** The token of the opened link, kept only in memory until the page is left (TS-SEC-01, ADR 0008). */
  readonly token: string | null;
  /** The list name of an invitation to a visitor without a session (FR-AUTH-06 AC4: the name and nothing else). */
  readonly listName: string | null;
  readonly joined: JoinedList | null;
  /** The token is being handed to the server before the login; the buttons cannot be pressed twice (UI-20). */
  readonly remembering: boolean;
}

const initialState: JoinState = {
  phase: 'checking',
  signedIn: null,
  token: null,
  listName: null,
  joined: null,
  remembering: false,
};

/**
 * View state of the join page `/j/:token` and `/j/consume`. With a session the token is sent in a request body and the
 * person joins at once (FR-SHARE-03); without one the page shows the invitation (FR-AUTH-06) and hands the token to the
 * server session before the login (ADR 0008). It calls use cases through the published APIs of the session and sharing
 * features only (NG-STATE-02/03). Provided at route level (NG-STATE-12).
 */
export const JoinStore = signalStore(
  withState<JoinState>(initialState),
  withMethods(
    (
      store,
      checkSignedIn = inject(CHECK_SIGNED_IN),
      joinList = inject(JOIN_LIST),
      lookupInvitation = inject(LOOKUP_INVITATION),
      rememberInvitation = inject(REMEMBER_INVITATION),
    ) => {
      async function join(token: string | undefined): Promise<void> {
        patchState(store, { phase: 'joining', signedIn: true });
        try {
          patchState(store, { phase: 'joined', joined: await joinList.execute(token) });
        } catch (error) {
          patchState(store, { phase: phaseOf(error) });
        }
      }

      return {
        /** `token` is absent on `/j/consume`: the person just came back from the login (FR-AUTH-06 AC3). */
        async start(token: string | undefined): Promise<void> {
          patchState(store, { ...initialState, token: token ?? null });
          if (token === undefined) {
            await join(undefined);
            return;
          }
          let signedIn: boolean;
          try {
            signedIn = await checkSignedIn.execute();
          } catch (error) {
            patchState(store, { phase: phaseOf(error) });
            return;
          }
          if (signedIn) {
            await join(token);
            return;
          }
          patchState(store, { signedIn: false });
          try {
            const invitation = await lookupInvitation.execute(token);
            patchState(store, { phase: 'invitation', listName: invitation.listName });
          } catch (error) {
            patchState(store, { phase: phaseOf(error) });
          }
        },

        /** Hands the token to the server session before the page goes to the login; `true` when the page may leave. */
        async remember(): Promise<boolean> {
          const token = store.token();
          if (token === null || store.remembering()) return false;
          patchState(store, { remembering: true });
          try {
            await rememberInvitation.execute(token);
            return true;
          } catch (error) {
            patchState(store, { phase: phaseOf(error), remembering: false });
            return false;
          }
        },
      };
    },
  ),
);

/** Expected outcomes become a phase; anything else is a bug and is rethrown to the global handler (TS-ARCH-23). */
function phaseOf(error: unknown): JoinPhase {
  if (error instanceof ShareLinkInvalidError) return 'invalid';
  if (error instanceof JoinLimitReachedError) return error.limit === 'members' ? 'memberLimit' : 'listLimit';
  if (error instanceof TechnicalError) return 'failed';
  throw error;
}
