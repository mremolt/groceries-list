import { TestBed } from '@angular/core/testing';
import { LOGOUT, type LogoutUseCase } from '@features/session';
import { TechnicalError } from '@platform/domain';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ShellStore } from './shell-store';

function setup() {
  const logout = mock<LogoutUseCase>();
  TestBed.configureTestingModule({ providers: [ShellStore, { provide: LOGOUT, useValue: logout }] });
  return { logout, store: TestBed.inject(ShellStore) };
}

describe('ShellStore', () => {
  it('signs out and answers the end-session address', async () => {
    const { logout, store } = setup();
    logout.execute.mockResolvedValue('https://idp.example/logout');

    expect(await store.logout()).toBe('https://idp.example/logout');
    expect(store.loggingOut()).toBe(true);
  });

  it('does not sign out twice while the first call runs (UI-20)', async () => {
    const { logout, store } = setup();
    let resolveLogout: ((url: string) => void) | undefined;
    logout.execute.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveLogout = resolve;
      }),
    );

    const first = store.logout();
    const second = await store.logout();
    resolveLogout?.('https://idp.example/logout');
    await first;

    expect(second).toBeNull();
    expect(logout.execute.mock.calls).toHaveLength(1);
  });

  it('marks a technical failure and allows another try', async () => {
    const { logout, store } = setup();
    logout.execute.mockRejectedValueOnce(new TechnicalError('server error'));
    logout.execute.mockResolvedValueOnce('https://idp.example/logout');

    expect(await store.logout()).toBeNull();
    expect(store.logoutFailed()).toBe(true);
    expect(store.loggingOut()).toBe(false);
    expect(await store.logout()).toBe('https://idp.example/logout');
    expect(store.logoutFailed()).toBe(false);
  });

  it('does not swallow an unexpected error', async () => {
    const { logout, store } = setup();
    logout.execute.mockRejectedValue(new TypeError('bug'));

    await expect(store.logout()).rejects.toThrow('bug');
  });
});
