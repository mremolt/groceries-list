import { DestroyRef, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { hasChanges, type ItemChanges } from '@features/items';
import { TranslocoService } from '@jsverse/transloco';
import { Announcer } from '@shared/ui/a11y/announcer';
import { Snackbar } from '@shared/ui/snackbar/snackbar';

import { ItemsStore, type RefreshResult } from '../items-store';
import { ListsStore } from '../lists-store';
import { ConnectionMonitor } from './connection-monitor';
import { PageActivity } from './page-activity';
import { Poller, type PollOutcome } from './poller';

const ITEMS_INTERVAL_MS = 5000; // FR-SYNC-01 AC1
const MAX_BACKOFF_MS = 15_000;

/**
 * Keeps the open list current (FR-SYNC-01..05): polls its items every 5 s with the etag it holds (ADR 0006), announces
 * what others changed (FR-SYNC-04), reads the lists again when the list moved (FR-SYNC-03), handles a list that is gone
 * (FR-SYNC-05) and tells the connection monitor what it sees (FR-FB-06). It coordinates the two stores, which never call
 * each other (NG-STATE-03). Provided with the page that shows the list; it stops with it.
 */
@Injectable()
export class ListSync {
  private readonly items = inject(ItemsStore);
  private readonly lists = inject(ListsStore);
  private readonly monitor = inject(ConnectionMonitor);
  private readonly announcer = inject(Announcer);
  private readonly snackbar = inject(Snackbar);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly activity = inject(PageActivity);
  private poller: Poller | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stop();
    });
  }

  /** Starts polling for `listId`; a running poll for another list ends. */
  start(listId: string): void {
    this.stop();
    this.poller = new Poller(
      { intervalMs: ITEMS_INTERVAL_MS, maxDelayMs: MAX_BACKOFF_MS, run: () => this.poll(listId) },
      this.activity,
    );
    this.poller.start();
  }

  stop(): void {
    this.poller?.stop();
    this.poller = undefined;
  }

  private async poll(listId: string): Promise<PollOutcome> {
    if (this.items.listId() !== listId) return 'ok';
    const result: RefreshResult = await this.items.refresh();
    switch (result.kind) {
      case 'failed':
        this.monitor.reportFailure();
        return 'failed';
      case 'removed':
        this.monitor.reportSuccess();
        await this.listRemoved(listId);
        return 'ok';
      case 'updated':
        this.monitor.reportSuccess();
        this.announce(result.changes);
        await this.refreshLists(listId);
        return 'ok';
      case 'unchanged':
        this.monitor.reportSuccess();
        return 'ok';
      case 'skipped':
        return 'ok';
    }
  }

  /** FR-SYNC-04: one polite announcement per sync, never for the person's own changes (they equal what is shown). */
  private announce(changes: ItemChanges): void {
    if (!hasChanges(changes)) return;
    const parts = (
      [
        ['added', changes.added],
        ['checked', changes.checked],
        ['unchecked', changes.unchecked],
        ['edited', changes.edited],
        ['removed', changes.removed],
      ] as const
    )
      .filter(([, count]) => count > 0)
      .map(([key, count]) => this.transloco.translate(`shell.sync.${key}`, { count }));
    this.announcer.announce(this.transloco.translate('shell.sync.updated', { changes: parts.join(', ') }));
  }

  /** The list's name and counts moved with its items: the drawer follows within seconds (FR-SYNC-03). */
  private async refreshLists(listId: string): Promise<void> {
    await this.lists.refresh();
    if (this.items.listId() === listId && this.items.status() === 'ready') {
      this.lists.setOpenCount(listId, this.items.openCount()); // the items are newer than the lists answer
    }
  }

  /** FR-SYNC-05: another member deleted the list, or the person left it on another device. */
  private async listRemoved(listId: string): Promise<void> {
    this.stop();
    if (this.lists.isDeparted(listId)) return; // the person did it here; the command shows its own message
    await this.lists.refresh();
    await this.router.navigateByUrl('/'); // the next list in the order of BR-10, or the empty state
    this.snackbar.show(this.transloco.translate('shell.snackbar.removed'));
  }
}
