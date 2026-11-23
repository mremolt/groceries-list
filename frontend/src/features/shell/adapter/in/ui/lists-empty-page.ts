import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { AppIcon } from '@shared/ui/icon/app-icon';
import { LoadingIndicator } from '@shared/ui/loading/loading-indicator';

import { ListActions } from './list-actions';
import { ListsStore } from './lists-store';
import { ConnectionMonitor } from './sync/connection-monitor';

/**
 * Start page without lists (FR-NAV-03 AC2, FR-FB-01 AC1). With lists the start guard has already redirected.
 *
 * Layout: one centred card (max 28 rem) on every size class; the drawer entry „Neue Liste“ does the same job.
 */
@Component({
  selector: 'app-lists-empty-page',
  imports: [EmptyState, LoadingIndicator, MatButton, AppIcon, TranslocoPipe],
  templateUrl: './lists-empty-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListsEmptyPage {
  protected readonly store = inject(ListsStore);
  private readonly actions = inject(ListActions);
  /** FR-FB-06 AC2: creating needs the server. */
  protected readonly offline = inject(ConnectionMonitor).offline;

  protected create(event: Event): void {
    if (this.offline()) return;
    const opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    void this.actions.create(() => opener ?? document.querySelector<HTMLElement>('h1'));
  }

  protected retry(): void {
    void this.store.reload();
  }
}
