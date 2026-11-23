import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { LOAD_CURRENT_USER, NotAuthenticatedError } from '@features/session';
import { LOGIN_PATH, PAGE_NAVIGATION } from '@platform';

/**
 * The shell is for signed-in people only. Without a session the whole page goes to the login at the BFF (the target
 * is the fixed internal path, TS-SEC-03) and the route never renders. Route guards improve UX only: every API call is
 * authorised on the server (NG-SEC-09, BR-01).
 */
export const authenticatedGuard: CanActivateFn = async () => {
  const loadCurrentUser = inject(LOAD_CURRENT_USER);
  const navigation = inject(PAGE_NAVIGATION);
  try {
    await loadCurrentUser.execute();
    return true;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      navigation.assign(LOGIN_PATH);
      return false;
    }
    throw error;
  }
};
