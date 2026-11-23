import { EmptyError, NEVER, Observable, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { untilAborted } from './until-aborted';

describe('untilAborted', () => {
  it('resolves with the first value', async () => {
    expect(await untilAborted(of('a', 'b'))).toBe('a');
  });

  it('rejects with the source error', async () => {
    await expect(untilAborted(throwError(() => new Error('boom')))).rejects.toThrow('boom');
  });

  it('rejects with the abort reason when the signal fires while waiting', async () => {
    const controller = new AbortController();
    const pending = untilAborted(NEVER, controller.signal);

    controller.abort(new Error('superseded'));

    await expect(pending).rejects.toThrow('superseded');
  });

  it('rejects at once with an already aborted signal', async () => {
    const controller = new AbortController();
    controller.abort(new Error('gone'));

    await expect(untilAborted(of(1), controller.signal)).rejects.toThrow('gone');
  });

  it('rejects with EmptyError when the source completes without a value', async () => {
    await expect(
      untilAborted(
        new Observable<never>((subscriber) => {
          subscriber.complete();
        }),
      ),
    ).rejects.toBeInstanceOf(EmptyError);
  });
});
