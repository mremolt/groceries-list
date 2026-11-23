import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CurrentUser } from '../domain/current-user';
import { NotAuthenticatedError } from '../domain/session-errors';
import type { CheckSignedInPort } from '../ports/out/check-signed-in-port';
import type { LoadCurrentUserPort } from '../ports/out/load-current-user-port';
import type { LogoutPort } from '../ports/out/logout-port';
import { CheckSignedInService } from './check-signed-in-service';
import { LoadCurrentUserService } from './load-current-user-service';
import { LogoutService } from './logout-service';

const USER: CurrentUser = { id: 'u1', displayName: 'Anna Beispiel', email: 'anna@example.test' };

describe('LoadCurrentUserService', () => {
  it('answers the user the port loads, passing the abort signal on', async () => {
    const port = mock<LoadCurrentUserPort>();
    const signal = new AbortController().signal;
    port.loadCurrentUser.calledWith(signal).mockResolvedValue(USER);

    expect(await new LoadCurrentUserService(port).execute(signal)).toEqual(USER);
  });

  it('lets the not-authenticated error through', async () => {
    const port = mock<LoadCurrentUserPort>();
    port.loadCurrentUser.mockRejectedValue(new NotAuthenticatedError());

    await expect(new LoadCurrentUserService(port).execute()).rejects.toBeInstanceOf(NotAuthenticatedError);
  });
});

describe('LogoutService', () => {
  it('signs out through the port and answers the end-session address', async () => {
    const port = mock<LogoutPort>();
    port.logout.mockResolvedValue('http://keycloak.localhost:8180/realms/groceries/protocol/openid-connect/logout');

    expect(await new LogoutService(port).execute()).toContain('/protocol/openid-connect/logout');
    expect(port.logout.mock.calls).toHaveLength(1);
  });
});

describe('CheckSignedInService', () => {
  it('answers what the port says, passing the abort signal on', async () => {
    const port = mock<CheckSignedInPort>();
    const signal = new AbortController().signal;
    port.isSignedIn.calledWith(signal).mockResolvedValue(false);

    expect(await new CheckSignedInService(port).execute(signal)).toBe(false);
  });
});
