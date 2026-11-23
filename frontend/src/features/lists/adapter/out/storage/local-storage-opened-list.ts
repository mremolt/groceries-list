import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import type { OpenedListMemoryPort } from '../../../ports/out/opened-list-memory-port';

const KEY = 'lastListId';

/**
 * The list opened last, per device, in `localStorage` (FR-NAV-03 AC1). Reading of TS-SEC-01: the value is a random list
 * id that grants nothing (access is checked on the server, BR-01), not a token, session id or personal data. Storage
 * can be blocked or full, then the start screen simply opens the first list.
 */
@Injectable()
export class LocalStorageOpenedList implements OpenedListMemoryPort {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;

  recall(): string | null {
    try {
      return this.storage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  }

  remember(id: string): void {
    try {
      this.storage?.setItem(KEY, id);
    } catch {
      // storage blocked or full: remembering the last list is a convenience only
    }
  }
}
