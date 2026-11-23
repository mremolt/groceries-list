import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { PageActivity } from './page-activity';

/** How long the server may be unreachable before the person is told (FR-FB-06 AC1). */
const OFFLINE_AFTER_MS = 10_000;

/**
 * Whether the app can reach the server (FR-FB-06). The pollers report what they see; the browser's own "offline" event
 * counts as a failure too. `offline` turns true after more than 10 seconds of failures counted from the first one, and
 * false at the first success.
 */
@Injectable({ providedIn: 'root' })
export class ConnectionMonitor {
  private readonly offlineState = signal(false);
  readonly offline = this.offlineState.asReadonly();
  private failing = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const unsubscribe = inject(PageActivity).onOffline(() => {
      this.reportFailure();
    });
    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      clearTimeout(this.timer);
    });
  }

  reportFailure(): void {
    if (this.failing) return;
    this.failing = true;
    this.timer = setTimeout(() => {
      this.offlineState.set(true);
    }, OFFLINE_AFTER_MS + 1);
  }

  reportSuccess(): void {
    this.failing = false;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.offlineState.set(false);
  }
}
