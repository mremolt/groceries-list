import { firstValueFrom, fromEvent, type Observable, takeUntil } from 'rxjs';

/**
 * First value of a generated service's observable as a promise that honours an `AbortSignal` (TS-API-06). Never a bare
 * `firstValueFrom`, which ignores the signal. Unsubscribing removes the abort listener.
 */
export async function untilAborted<T>(source: Observable<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  try {
    return await firstValueFrom(signal ? source.pipe(takeUntil(fromEvent(signal, 'abort'))) : source);
  } catch (error) {
    signal?.throwIfAborted(); // aborted: reject with the signal's reason, not with EmptyError
    throw error;
  }
}
