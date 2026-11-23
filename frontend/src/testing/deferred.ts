/** A promise the test settles by hand, for races between two calls (TS-ARCH-21 tests). */
export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}

export function deferred<T>(): Deferred<T> {
  const handle: { settle?: (value: T) => void } = {};
  const promise = new Promise<T>((done) => {
    handle.settle = done;
  });
  return {
    promise,
    resolve: (value) => {
      handle.settle?.(value);
    },
  };
}
