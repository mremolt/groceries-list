import type { Page } from '@playwright/test';

import type { UpdateCurrentUserRequest } from '../../src/features/session/adapter/out/http/generated/model/updateCurrentUserRequest';
import { stubUser } from './session';

// The body type comes from the backend's committed spec through the generated client model, so this fixture stops
// compiling when the contract moves (API-CON-11, TS-TEST-10).

export interface ProfileStub {
  /** What the page sent: the patched names, and the number of delete calls. */
  readonly sent: { patched: UpdateCurrentUserRequest[]; deleted: number };
  /** `DELETE /api/v1/me` answers 403 `REAUTH_REQUIRED` while this is true (the IdP login is older than 5 minutes). */
  readonly state: { reauthRequired: boolean };
  /** The next save or delete fails with a server error. */
  failNext: (command: 'patch' | 'delete') => void;
}

function problem(status: number, code: string, errors?: { field: string; code: string }[]) {
  return {
    status,
    contentType: 'application/problem+json',
    json: { type: 'about:blank', title: code, status, code, ...(errors ? { errors } : {}) },
  };
}

/**
 * A stub of the profile commands, answering like the backend: a name of 1-50 characters after trimming is saved and
 * answered with the profile; anything else is a 400 `VALIDATION_FAILED`; deleting needs a recent login (ADR 0003).
 */
export async function stubProfile(page: Page): Promise<ProfileStub> {
  const sent: ProfileStub['sent'] = { patched: [], deleted: 0 };
  const state = { reauthRequired: false };
  const failing = new Set<'patch' | 'delete'>();

  await page.route('**/api/v1/me', async (route) => {
    const method = route.request().method();
    if (method === 'PATCH') {
      const body = route.request().postDataJSON() as UpdateCurrentUserRequest;
      sent.patched.push(body);
      if (failing.delete('patch')) return route.fulfill(problem(500, 'INTERNAL_ERROR'));
      const name = body.displayName.trim();
      if (name.length === 0) {
        return route.fulfill(
          problem(400, 'VALIDATION_FAILED', [{ field: 'displayName', code: 'DISPLAY_NAME_REQUIRED' }]),
        );
      }
      if (name.length > 50) {
        return route.fulfill(
          problem(400, 'VALIDATION_FAILED', [{ field: 'displayName', code: 'DISPLAY_NAME_TOO_LONG' }]),
        );
      }
      return route.fulfill({ json: { ...stubUser, displayName: name } });
    }
    if (method === 'DELETE') {
      sent.deleted += 1;
      if (failing.delete('delete')) return route.fulfill(problem(500, 'INTERNAL_ERROR'));
      if (state.reauthRequired) return route.fulfill(problem(403, 'REAUTH_REQUIRED'));
      return route.fulfill({ status: 204 });
    }
    return route.fallback();
  });

  return {
    sent,
    state,
    failNext: (command) => {
      failing.add(command);
    },
  };
}
