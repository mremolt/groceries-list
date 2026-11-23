import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TranslocoPipe } from '@jsverse/transloco';

/** Placeholder start page of M0: design tokens, theme switching and the landmark/heading structure (FR-NAV-04). */
@Component({
  selector: 'app-home-page',
  imports: [MatCardModule, TranslocoPipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
