import { DestroyRef, inject, Injectable } from '@angular/core';

import { ItemsStore } from '../items-store';
import { ListsStore } from '../lists-store';
import { ConnectionMonitor } from './connection-monitor';
import { PageActivity } from './page-activity';
import { Poller, type PollOutcome } from './poller';

const LISTS_INTERVAL_MS = 30_000; // FR-SYNC-03 AC1 (Should)
const MAX_BACKOFF_MS = 60_000;

/**
 * Keeps the drawer current (FR-SYNC-03): reads the user's lists every 30 s while the page is visible and at once when it
 * gets the focus back. One call for all lists (ADR 0006, API-N1-01). The open list's own count comes from its items,
 * which are newer than this answer. Started by the app shell; it stops with it.
 */
@Injectable()
export class ShellSync {
  private readonly lists = inject(ListsStore);
  private readonly items = inject(ItemsStore);
  private readonly monitor = inject(ConnectionMonitor);
  private readonly poller = new Poller(
    { intervalMs: LISTS_INTERVAL_MS, maxDelayMs: MAX_BACKOFF_MS, run: () => this.poll() },
    inject(PageActivity),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stop();
    });
  }

  start(): void {
    this.poller.start();
  }

  stop(): void {
    this.poller.stop();
  }

  private async poll(): Promise<PollOutcome> {
    const result = await this.lists.refresh();
    if (result === 'failed') {
      this.monitor.reportFailure();
      return 'failed';
    }
    if (result === 'ok') {
      this.monitor.reportSuccess();
      const open = this.items.listId();
      if (open !== null && this.items.status() === 'ready') this.lists.setOpenCount(open, this.items.openCount());
    }
    return 'ok';
  }
}
