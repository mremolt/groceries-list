import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { TranslocoPipe } from '@jsverse/transloco';

/** Placeholder of `/einstellungen` (FR-NAV-06): the settings arrive with M6. One card on every size class. */
@Component({
  selector: 'app-settings-page',
  imports: [MatCard, MatCardContent, TranslocoPipe],
  templateUrl: './settings-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {}
