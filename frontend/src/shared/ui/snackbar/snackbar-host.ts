import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

import { AppIcon } from '../icon/app-icon';
import { Snackbar } from './snackbar';

/**
 * Renders the current snackbar. Layout (NG-UI-23): compact = full width with 12 px margins at the bottom; medium and
 * expanded = bottom start, 344-560 px wide. The status region always exists so that a new message is announced.
 */
@Component({
  selector: 'app-snackbar-host',
  imports: [MatIconButton, AppIcon, TranslocoPipe],
  templateUrl: './snackbar-host.html',
  styleUrl: './snackbar-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnackbarHost {
  protected readonly snackbar = inject(Snackbar);
}
