import type { Item } from './item';

/**
 * The answer to loading the items of a list (ADR 0006): the snapshot with the `etag` that names it, or "unchanged" when
 * the caller named the etag it already holds and the list did not move since (NFR-PERF-04).
 */
export type ItemsLoad =
  { readonly kind: 'changed'; readonly items: readonly Item[]; readonly etag: string } | { readonly kind: 'unchanged' };

/** What a caller may say when it loads the items. */
export interface LoadItemsOptions {
  readonly signal?: AbortSignal;
  /** The etag of the snapshot the caller holds; answered with `unchanged` while it is current. */
  readonly etag?: string;
}
