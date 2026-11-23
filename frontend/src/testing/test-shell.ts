import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Router host for routing tests of platform code, which may not import the app or a feature. */
@Component({
  selector: 'app-test-shell',
  imports: [RouterOutlet],
  templateUrl: './test-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestShell {}
