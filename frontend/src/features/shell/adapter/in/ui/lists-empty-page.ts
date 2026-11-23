import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { AppIcon } from '@shared/ui/icon/app-icon';

/**
 * Start page without lists (FR-NAV-03 AC2, FR-FB-01 AC1). The button is inactive until lists exist (M2).
 *
 * Layout: one centred card (max 28 rem) on every size class; the drawer entry „Neue Liste“ does the same job.
 */
@Component({
  selector: 'app-lists-empty-page',
  imports: [EmptyState, MatButton, AppIcon, TranslocoPipe],
  templateUrl: './lists-empty-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListsEmptyPage {}
