import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AppIcon, type AppIconName } from '../icon/app-icon';

/**
 * Card with icon, heading, text, one primary action and a hint (FR-FB-01, NG-UI-35). The action and the hint are
 * projected: `<button empty-action>` and `<p empty-hint>`. The heading level is an input because the page already has
 * its h1 in the app bar.
 */
@Component({
  selector: 'app-empty-state',
  imports: [AppIcon],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input.required<AppIconName>();
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
}
