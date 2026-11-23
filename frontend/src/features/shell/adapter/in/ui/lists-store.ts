import { inject } from '@angular/core';
import {
  CHOOSE_START_LIST,
  CREATE_LIST,
  DELETE_LIST,
  LEAVE_LIST,
  ListLimitReachedError,
  ListNameInvalidError,
  ListNotFoundError,
  LOAD_LIST,
  LOAD_MY_LISTS,
  REMEMBER_OPENED_LIST,
  RENAME_LIST,
  type ShoppingList,
} from '@features/lists';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { TechnicalError } from '@platform/domain';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** The list page: what is open right now (FR-NAV-06 AC2: not found and no access look the same). */
type CurrentList =
  | { readonly status: 'none' }
  | { readonly status: 'loading'; readonly id: string }
  | { readonly status: 'found'; readonly list: ShoppingList }
  | { readonly status: 'notFound'; readonly id: string }
  | { readonly status: 'failed'; readonly id: string };

interface ListsState {
  readonly lists: readonly ShoppingList[];
  readonly status: LoadStatus;
  readonly current: CurrentList;
  /** A list command is running; it cannot be submitted twice (UI-20). */
  readonly busy: boolean;
}

/** An expected outcome of a list command, answered to the dialog that started it (not an exception, ARCH-UC-10). */
export type ListCommandResult =
  | { readonly ok: true; readonly list: ShoppingList | null }
  | { readonly ok: false; readonly reason: 'nameRequired' | 'nameTooLong' | 'limitReached' | 'notFound' | 'failed' };

const initialState: ListsState = { lists: [], status: 'idle', current: { status: 'none' }, busy: false };

/**
 * View state of the navigation lists and the open list (NG-STATE-01). It calls use cases through the published API of
 * the lists feature only (NG-STATE-02/03). The drawer counts come from one `listMyLists` call, never one call per list
 * (API-N1-01, ADR 0006). Provided at route level of the shell (NG-STATE-12).
 */
export const ListsStore = signalStore(
  withState<ListsState>(initialState),
  withComputed((store) => ({
    hasLists: () => store.lists().length > 0,
    currentList: () => {
      const current = store.current();
      return current.status === 'found' ? current.list : null;
    },
  })),
  withMethods(
    (
      store,
      loadMyLists = inject(LOAD_MY_LISTS),
      loadList = inject(LOAD_LIST),
      createList = inject(CREATE_LIST),
      renameList = inject(RENAME_LIST),
      deleteList = inject(DELETE_LIST),
      leaveList = inject(LEAVE_LIST),
      chooseStartList = inject(CHOOSE_START_LIST),
      rememberOpened = inject(REMEMBER_OPENED_LIST),
    ) => {
      let listsLoad: AbortController | undefined;
      let currentLoad: AbortController | undefined;

      /** A new load supersedes the previous one (NG-STATE-18, TS-ARCH-21). */
      async function reload(): Promise<void> {
        listsLoad?.abort();
        const control = new AbortController();
        listsLoad = control;
        if (store.status() !== 'ready') patchState(store, { status: 'loading' });
        try {
          const lists = await loadMyLists.execute(control.signal);
          if (!control.signal.aborted) patchState(store, { lists, status: 'ready' });
        } catch (error) {
          if (control.signal.aborted) return;
          if (!(error instanceof TechnicalError)) throw error;
          patchState(store, { status: 'failed' });
        }
      }

      async function command(run: () => Promise<ShoppingList | null>): Promise<ListCommandResult> {
        if (store.busy()) return { ok: false, reason: 'failed' };
        patchState(store, { busy: true });
        try {
          const list = await run();
          await reload();
          return { ok: true, list };
        } catch (error) {
          if (error instanceof ListNameInvalidError) {
            return { ok: false, reason: error.problem === 'required' ? 'nameRequired' : 'nameTooLong' };
          }
          if (error instanceof ListLimitReachedError) return { ok: false, reason: 'limitReached' };
          if (error instanceof ListNotFoundError) {
            await reload();
            return { ok: false, reason: 'notFound' };
          }
          if (error instanceof TechnicalError) return { ok: false, reason: 'failed' };
          throw error;
        } finally {
          patchState(store, { busy: false });
        }
      }

      return {
        reload,

        /** Loads the lists once; later calls wait for nothing (the drawer shows what is there). */
        async ensureLoaded(): Promise<void> {
          if (store.status() === 'idle' || store.status() === 'failed') await reload();
        },

        /** The list to open at start (FR-NAV-03 AC1), or `null` for the empty state. */
        startListId(): string | null {
          return chooseStartList.execute(store.lists());
        },

        /** Opens a list page: remembers it for this device when it exists. */
        async open(id: string): Promise<void> {
          currentLoad?.abort();
          const control = new AbortController();
          currentLoad = control;
          patchState(store, { current: { status: 'loading', id } });
          try {
            const list = await loadList.execute(id, control.signal);
            if (control.signal.aborted) return;
            rememberOpened.execute(list.id);
            patchState(store, { current: { status: 'found', list } });
          } catch (error) {
            if (control.signal.aborted) return;
            if (error instanceof ListNotFoundError) {
              patchState(store, { current: { status: 'notFound', id } });
            } else if (error instanceof TechnicalError) {
              patchState(store, { current: { status: 'failed', id } });
            } else {
              throw error;
            }
          }
        },

        /**
         * The open count of one list changed through its items: patched locally, so the drawer follows without another
         * request (API-N1-01). The next full load brings the server's number again.
         */
        setOpenCount(id: string, openCount: number): void {
          const current = store.current();
          patchState(store, {
            lists: store.lists().map((list) => (list.id === id ? { ...list, openCount } : list)),
            ...(current.status === 'found' && current.list.id === id
              ? { current: { status: 'found' as const, list: { ...current.list, openCount } } }
              : {}),
          });
        },

        close(): void {
          currentLoad?.abort();
          patchState(store, { current: { status: 'none' } });
        },

        create: (name: string): Promise<ListCommandResult> => command(() => createList.execute(name)),

        async rename(id: string, name: string): Promise<ListCommandResult> {
          const result = await command(() => renameList.execute(id, name));
          if (result.ok && result.list && store.currentList()?.id === id) {
            patchState(store, { current: { status: 'found', list: result.list } });
          }
          return result;
        },

        delete: (id: string): Promise<ListCommandResult> =>
          command(async () => {
            await deleteList.execute(id);
            return null;
          }),

        leave: (id: string): Promise<ListCommandResult> =>
          command(async () => {
            await leaveList.execute(id);
            return null;
          }),
      };
    },
  ),
);
