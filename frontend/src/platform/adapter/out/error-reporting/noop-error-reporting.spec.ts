import { describe, expect, it } from 'vitest';

import { NoopErrorReporting } from './noop-error-reporting';

describe('NoopErrorReporting', () => {
  it('drops reports without side effects', () => {
    const adapter = new NoopErrorReporting();

    adapter.send({ fingerprint: 'TypeError:TypeError', name: 'TypeError', message: 'TypeError' });

    expect(adapter.last?.name).toBe('TypeError');
  });
});
