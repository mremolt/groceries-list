import { afterEach, describe, expect, it, vi } from 'vitest';

import { RuntimeConfigHolder, RuntimeConfigSchema } from './runtime-config-loader';

const valid = { environment: 'local', apiBaseUrl: '/api', errorReporting: { enabled: false, path: '/api/v1/errors' } };

function stubFetch(response: Partial<Response>) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RuntimeConfigSchema', () => {
  it('accepts a valid file', () => {
    expect(RuntimeConfigSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ['environment', { ...valid, environment: '' }],
    ['apiBaseUrl (absolute URL)', { ...valid, apiBaseUrl: 'https://elsewhere.example/api' }],
    ['errorReporting', { ...valid, errorReporting: { enabled: true } }],
    ['missing apiBaseUrl', { environment: 'x', errorReporting: valid.errorReporting }],
  ])('rejects an invalid %s', (_name, value) => {
    expect(() => RuntimeConfigSchema.parse(value)).toThrow();
  });
});

describe('RuntimeConfigHolder', () => {
  it('loads the config with a relative URL and no cache', async () => {
    const fetchMock = stubFetch({ ok: true, json: () => Promise.resolve(valid) });
    const holder = new RuntimeConfigHolder();

    await holder.load();

    expect(fetchMock).toHaveBeenCalledWith('/config.json', { cache: 'no-store' });
    expect(holder.value).toEqual(valid);
    expect(Object.isFrozen(holder.value)).toBe(true);
  });

  it('rejects on a non-2xx answer', async () => {
    stubFetch({ ok: false, status: 503 });
    await expect(new RuntimeConfigHolder().load()).rejects.toThrow('503');
  });

  it('rejects on invalid JSON content', async () => {
    stubFetch({ ok: true, json: () => Promise.reject(new SyntaxError('bad json')) });
    await expect(new RuntimeConfigHolder().load()).rejects.toThrow('bad json');
  });

  it('throws when read before load', () => {
    expect(() => new RuntimeConfigHolder().value).toThrow('before the app initializer');
  });
});
