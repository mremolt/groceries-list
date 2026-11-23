import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';

/** Indeterminate loading state with an accessible name (UI-19, NG-UI-35). Shown inside the region that loads. */
@Component({
  selector: 'app-loading-indicator',
  imports: [MatProgressBar],
  templateUrl: './loading-indicator.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingIndicator {
  readonly label = input.required<string>();
}
