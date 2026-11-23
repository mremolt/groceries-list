import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** A routed page with one main heading (the app name from the platform catalog). */
@Component({
  selector: 'app-test-page',
  imports: [TranslocoPipe],
  templateUrl: './test-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestPage {}
