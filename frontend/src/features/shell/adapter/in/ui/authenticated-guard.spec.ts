import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  type CurrentUser,
  LOAD_CURRENT_USER,
  type LoadCurrentUserUseCase,
  NotAuthenticatedError,
} from '@features/session';
import { LOGIN_PATH, PAGE_NAVIGATION, type PageNavigation } from '@platform';
import { mock } from 'vitest-mock-extended';
import { describe, expect, it } from 'vitest';

import { authenticatedGuard } from './authenticated-guard';

function setup() {
  const loadCurrentUser = mock<LoadCurrentUserUseCase>();
  const navigation = mock<PageNavigation>();
  TestBed.configureTestingModule({
    providers: [
      { provide: LOAD_CURRENT_USER, useValue: loadCurrentUser },
      { provide: PAGE_NAVIGATION, useValue: navigation },
    ],
  });
  const run = () =>
    TestBed.runInInjectionContext(() => authenticatedGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  return { loadCurrentUser, navigation, run };
}

describe('authenticatedGuard', () => {
  it('lets a signed-in person pass', async () => {
    const { loadCurrentUser, navigation, run } = setup();
    const user: CurrentUser = { id: 'u1', displayName: 'Anna', email: 'anna@example.test' };
    loadCurrentUser.execute.mockResolvedValue(user);

    expect(await run()).toBe(true);
    expect(navigation.assign).not.toHaveBeenCalled();
  });

  it('sends the whole page to the login without a session and blocks the route', async () => {
    const { loadCurrentUser, navigation, run } = setup();
    loadCurrentUser.execute.mockRejectedValue(new NotAuthenticatedError());

    expect(await run()).toBe(false);
    expect(navigation.assign).toHaveBeenCalledWith(LOGIN_PATH);
  });

  it('does not hide other failures behind a login redirect', async () => {
    const { loadCurrentUser, navigation, run } = setup();
    loadCurrentUser.execute.mockRejectedValue(new Error('server down'));

    await expect(run()).rejects.toThrow('server down');
    expect(navigation.assign).not.toHaveBeenCalled();
  });
});
