import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { ListsStore } from './lists-store';

/**
 * The start route (FR-NAV-03 AC1): opens the list opened last on this device, otherwise the first list (BR-10);
 * without lists the empty state stays. It waits for the lists, so the empty state never flashes before a redirect.
 */
export const startGuard: CanActivateFn = async () => {
  const store = inject(ListsStore);
  const router = inject(Router); // before the first await: `inject` needs the injection context
  await store.ensureLoaded();
  const id = store.startListId();
  return id ? router.createUrlTree(['/listen', id]) : true;
};
