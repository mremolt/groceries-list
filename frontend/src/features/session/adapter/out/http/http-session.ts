import { Injectable } from '@angular/core';

import type { CurrentUser } from '../../../domain/current-user';
import type { LoadCurrentUserPort } from '../../../ports/out/load-current-user-port';
import type { LogoutPort } from '../../../ports/out/logout-port';

/** Interim until the generated client exists (the backend spec is not published yet). */
@Injectable()
export class HttpSession implements LoadCurrentUserPort, LogoutPort {
  loadCurrentUser(): Promise<CurrentUser> {
    return Promise.reject(new Error('session API client not generated yet'));
  }

  logout(): Promise<string> {
    return Promise.reject(new Error('session API client not generated yet'));
  }
}
