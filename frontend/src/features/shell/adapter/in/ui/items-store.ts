import { inject } from '@angular/core';
import {
  ADD_ITEM,
  checkedItems,
  CLEAR_CHECKED_ITEMS,
  DELETE_ITEM,
  describeChanges,
  EDIT_ITEM,
  type Item,
  type ItemChanges,
  ItemLimitReachedError,
  ItemListNotFoundError,
  ItemNotFoundError,
  ItemTextInvalidError,
  LOAD_ITEMS,
  openItems,
  reuseUnchanged,
  SET_ITEM_DONE,
} from '@features/items';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { TechnicalError } from '@platform/domain';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed' | 'notFound';

interface ItemsState {
  /** The list the items belong to; `null` before the first load. */
  readonly listId: string | null;
  readonly items: readonly Item[];
  readonly status: LoadStatus;
  /** An add is running; a second one waits for the field to be free (the text must not be lost, FR-FB-05 AC2). */
  readonly adding: boolean;
  /** The etag of the snapshot the items come from; sent with the next poll (ADR 0006). */
  readonly etag: string | null;
}

/** Expected outcomes of an item command, answered to the UI that started it (not exceptions, ARCH-UC-10). */
export type ItemFailure = 'textRequired' | 'textTooLong' | 'limitReached' | 'gone' | 'busy' | 'failed';
export type ItemCommandResult = { readonly ok: true } | { readonly ok: false; readonly reason: ItemFailure };
export type ClearCheckedResult =
  { readonly ok: true; readonly removed: number } | { readonly ok: false; readonly reason: ItemFailure };

/**
 * What a background poll found (FR-SYNC-01): `skipped` when the person is changing something or another list opened, so the
 * answer could be older than what is shown; `removed` when the list is gone (FR-SYNC-05); `failed` when the server could
 * not be reached (FR-FB-06).
 */
export type RefreshResult =
  | { readonly kind: 'unchanged' | 'skipped' | 'removed' | 'failed' }
  | { readonly kind: 'updated'; readonly changes: ItemChanges };

const initialState: ItemsState = { listId: null, items: [], status: 'idle', adding: false, etag: null };

/** Maps the expected failures of the use cases to the answer; anything unexpected propagates (TS-ARCH-23). */
function failure(error: unknown): { readonly ok: false; readonly reason: ItemFailure } {
  if (error instanceof ItemTextInvalidError) {
    return { ok: false, reason: error.problem === 'required' ? 'textRequired' : 'textTooLong' };
  }
  if (error instanceof ItemLimitReachedError) return { ok: false, reason: 'limitReached' };
  if (error instanceof ItemNotFoundError || error instanceof ItemListNotFoundError)
    return { ok: false, reason: 'gone' };
  if (error instanceof TechnicalError) return { ok: false, reason: 'failed' };
  throw error;
}

/**
 * View state of the items of the open list (NG-STATE-01). It calls the use cases of the items feature only (NG-STATE-02);
 * the drawer counts are the lists store's business and reach it through the page, never through this store
 * (NG-STATE-03). Checking is optimistic and rolled back on failure (FR-ITEM-02 AC2); saves of one item run one after the
 * other, so the last click wins on the server too (NG-STATE-18, ADR 0007). Provided at route level (NG-STATE-12).
 */
export const ItemsStore = signalStore(
  withState<ItemsState>(initialState),
  withComputed((store) => {
    const open = () => openItems(store.items());
    const checked = () => checkedItems(store.items());
    return {
      open,
      checked,
      openCount: () => open().length,
      checkedCount: () => checked().length,
      total: () => store.items().length,
    };
  }),
  withMethods(
    (
      store,
      loadItems = inject(LOAD_ITEMS),
      addItem = inject(ADD_ITEM),
      editItem = inject(EDIT_ITEM),
      setItemDone = inject(SET_ITEM_DONE),
      deleteItem = inject(DELETE_ITEM),
      clearChecked = inject(CLEAR_CHECKED_ITEMS),
    ) => {
      let loading: AbortController | undefined;
      let polling: AbortController | undefined;
      /**
       * Own changes that are running, and a stamp that moves whenever one starts or ends. A poll whose request began
       * before a stamp move may predate the change, so its answer is dropped rather than undoing the change (FR-SYNC-01 AC5).
       */
      let pending = 0;
      let stamp = 0;
      const queues = new Map<string, Promise<unknown>>();

      function replace(saved: Item): void {
        patchState(store, { items: store.items().map((item) => (item.id === saved.id ? saved : item)) });
      }

      function drop(id: string): void {
        patchState(store, { items: store.items().filter((item) => item.id !== id) });
      }

      function listId(): string {
        const id = store.listId();
        if (id === null) throw new Error('no list loaded');
        return id;
      }

      /** Runs `task` after the earlier saves of the same item (a per-key save queue). */
      function queued<T>(id: string, task: () => Promise<T>): Promise<T> {
        const run = (queues.get(id) ?? Promise.resolve()).then(task, task);
        const tail = run.catch(() => undefined);
        queues.set(id, tail);
        void tail.then(() => {
          if (queues.get(id) === tail) queues.delete(id);
        });
        return run;
      }

      async function tracked<T>(task: () => Promise<T>): Promise<T> {
        pending += 1;
        stamp += 1;
        try {
          return await task();
        } finally {
          pending -= 1;
          stamp += 1;
        }
      }

      async function load(id: string): Promise<void> {
        loading?.abort();
        const control = new AbortController();
        loading = control;
        const sameList = store.listId() === id;
        patchState(store, {
          listId: id,
          status: sameList && store.status() === 'ready' ? 'ready' : 'loading',
          items: sameList ? store.items() : [],
          etag: sameList ? store.etag() : null,
        });
        try {
          const result = await loadItems.execute(id, { signal: control.signal });
          if (!control.signal.aborted && result.kind === 'changed') {
            patchState(store, { items: result.items, etag: result.etag, status: 'ready' });
          }
        } catch (error) {
          if (control.signal.aborted) return;
          if (error instanceof ItemListNotFoundError) patchState(store, { status: 'notFound', items: [] });
          else if (error instanceof TechnicalError) patchState(store, { status: 'failed' });
          else throw error;
        } finally {
          if (loading === control) loading = undefined;
        }
      }

      /** FR-SYNC-01: one conditional poll of the open list; never shown as loading, never as an error. */
      async function refresh(): Promise<RefreshResult> {
        const id = store.listId();
        if (id === null || store.status() !== 'ready' || pending > 0 || store.adding() || loading !== undefined) {
          return { kind: 'skipped' };
        }
        const startedAt = stamp;
        const control = new AbortController();
        polling?.abort();
        polling = control;
        try {
          const result = await loadItems.execute(id, {
            signal: control.signal,
            ...(store.etag() ? { etag: store.etag() ?? '' } : {}),
          });
          const stale =
            control.signal.aborted || store.listId() !== id || stamp !== startedAt || pending > 0 || store.adding();
          if (stale) return { kind: 'skipped' };
          if (result.kind === 'unchanged') return { kind: 'unchanged' };
          const changes = describeChanges(store.items(), result.items);
          patchState(store, { items: reuseUnchanged(store.items(), result.items), etag: result.etag });
          return { kind: 'updated', changes };
        } catch (error) {
          if (control.signal.aborted) return { kind: 'skipped' };
          if (error instanceof ItemListNotFoundError) return { kind: 'removed' };
          if (error instanceof TechnicalError) return { kind: 'failed' };
          throw error;
        }
      }

      return {
        load,
        refresh,

        /** FR-ITEM-01: the saved item joins the end of „Noch zu kaufen“ (BR-09). */
        add: (text: string): Promise<ItemCommandResult> =>
          tracked(async () => {
            if (store.adding()) return { ok: false, reason: 'busy' };
            patchState(store, { adding: true });
            try {
              const created = await addItem.execute(listId(), text);
              patchState(store, { items: [...store.items(), created] });
              return { ok: true };
            } catch (error) {
              return failure(error);
            } finally {
              patchState(store, { adding: false });
            }
          }),

        /** FR-ITEM-02: shown at once, saved afterwards, undone when saving fails. */
        setDone: (id: string, done: boolean): Promise<ItemCommandResult> =>
          tracked(async () => {
            const before = store.items().find((item) => item.id === id);
            if (!before) return { ok: false, reason: 'gone' };
            replace({ ...before, done });
            const list = listId();
            try {
              const saved = await queued(id, () => setItemDone.execute(list, id, done));
              const current = store.items().find((item) => item.id === id);
              // a later click on the same item is already shown; only the version of the answer is taken over
              if (store.listId() === list && current) replace({ ...current, version: saved.version });
              return { ok: true };
            } catch (error) {
              const result = failure(error);
              if (result.reason === 'gone') drop(id);
              else if (store.listId() === list) {
                const current = store.items().find((item) => item.id === id);
                if (current?.done === done) replace({ ...current, done: before.done });
              }
              return result;
            }
          }),

        /** FR-ITEM-03: the dialog stays open until the text is saved, so the typed text is never lost (FR-FB-05 AC2). */
        edit: (id: string, text: string): Promise<ItemCommandResult> =>
          tracked(async () => {
            try {
              replace(await queued(id, () => editItem.execute(listId(), id, text)));
              return { ok: true };
            } catch (error) {
              const result = failure(error);
              if (result.reason === 'gone') drop(id);
              return result;
            }
          }),

        /** FR-ITEM-04: no confirmation (BR-11); an item that is already gone counts as deleted. */
        remove: (id: string): Promise<ItemCommandResult> =>
          tracked(async () => {
            try {
              await queued(id, () => deleteItem.execute(listId(), id));
              drop(id);
              return { ok: true };
            } catch (error) {
              const result = failure(error);
              if (result.reason === 'gone') drop(id);
              return result;
            }
          }),

        /** FR-ITEM-05: only the given ids; what others changed meanwhile is read back afterwards (AC4). */
        clearChecked: (ids: readonly string[]): Promise<ClearCheckedResult> =>
          tracked(async () => {
            const list = listId();
            try {
              const removed = await clearChecked.execute(list, ids);
              await load(list);
              return { ok: true, removed };
            } catch (error) {
              return failure(error);
            }
          }),
      };
    },
  ),
);
