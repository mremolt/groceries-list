import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  type CurrentUser,
  LOAD_CURRENT_USER,
  type LoadCurrentUserUseCase,
  NotAuthenticatedError,
} from '@features/session';
import { LOGIN_PATH, PAGE_NAVIGATION, type PageNavigation } from '@platform';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { authenticatedGuard } from './authenticated-guard';

function setup() {
  const loadCurrentUser = mock<LoadCurrentUserUseCase>();
  // NG-TOOL-11: explicit fake, `expect(mock.method)` trips unbound-method
  const assign = vi.fn<(url: string) => void>();
  const navigation: PageNavigation = { assign };
  TestBed.configureTestingModule({
    providers: [
      { provide: LOAD_CURRENT_USER, useValue: loadCurrentUser },
      { provide: PAGE_NAVIGATION, useValue: navigation },
    ],
  });
  const run = () =>
    TestBed.runInInjectionContext(() => authenticatedGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  return { loadCurrentUser, assign, run };
}

describe('authenticatedGuard', () => {
  it('lets a signed-in person pass', async () => {
    const { loadCurrentUser, assign, run } = setup();
    const user: CurrentUser = { id: 'u1', displayName: 'Anna', email: 'anna@example.test' };
    loadCurrentUser.execute.mockResolvedValue(user);

    expect(await run()).toBe(true);
    expect(assign).not.toHaveBeenCalled();
  });

  it('sends the whole page to the login without a session and blocks the route', async () => {
    const { loadCurrentUser, assign, run } = setup();
    loadCurrentUser.execute.mockRejectedValue(new NotAuthenticatedError());

    expect(await run()).toBe(false);
    expect(assign).toHaveBeenCalledWith(LOGIN_PATH);
  });

  it('does not hide other failures behind a login redirect', async () => {
    const { loadCurrentUser, assign, run } = setup();
    loadCurrentUser.execute.mockRejectedValue(new Error('server down'));

    await expect(run()).rejects.toThrow('server down');
    expect(assign).not.toHaveBeenCalled();
  });
});
