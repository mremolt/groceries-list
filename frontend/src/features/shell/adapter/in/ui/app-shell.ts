import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import {
  type ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PAGE_NAVIGATION } from '@platform';
import { AppIcon } from '@shared/ui/icon/app-icon';
import { WindowSize } from '@shared/ui/layout/window-size';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { SnackbarHost } from '@shared/ui/snackbar/snackbar-host';
import { filter, map, startWith } from 'rxjs';

import { ShellStore } from './shell-store';

/** The translation key of the page heading, set as `data.heading` on the route (FR-NAV-04 AC1). */
function headingKeyOf(route: ActivatedRouteSnapshot): string {
  let current: ActivatedRouteSnapshot | null = route;
  let key = '';
  while (current) {
    const heading = current.data['heading'];
    if (typeof heading === 'string') key = heading;
    current = current.firstChild;
  }
  return key;
}

/**
 * The app frame (FR-NAV-01): top app bar with the page's h1, navigation drawer, content, snackbar.
 *
 * Layout per size class (NG-UI-23, UI-08):
 * - compact (< 600 px): one column; the drawer is modal (`over`), opened by "Navigation öffnen" in the app bar.
 * - medium (600-839 px): same as compact (FR-NAV-01 over the rail of NG-UI-10; recorded in the implementation log).
 * - expanded (>= 840 px): the drawer is permanent (`side`, 360 px) at the start; no menu button, no close button.
 * `WindowSize` decides only the drawer mode and whether it starts open (NG-UI-21); everything else is CSS.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    MatButton,
    MatIconButton,
    MatDivider,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    AppIcon,
    SnackbarHost,
    TranslocoPipe,
  ],
  providers: [ShellStore],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly navigation = inject(PAGE_NAVIGATION);
  private readonly snackbar = inject(Snackbar);
  protected readonly store = inject(ShellStore);
  protected readonly windowSize = inject(WindowSize);

  protected readonly drawer = viewChild.required(MatSidenav);

  protected readonly expanded = computed(() => this.windowSize.sizeClass() === 'expanded');
  protected readonly headingKey = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => headingKeyOf(this.router.routerState.snapshot.root)),
    ),
    { initialValue: '' },
  );

  /** FR-NAV-02 AC4: selecting an entry closes the modal drawer. */
  protected closeIfModal(): void {
    if (!this.expanded()) void this.drawer().close();
  }

  protected async logout(): Promise<void> {
    const url = await this.store.logout();
    if (url) {
      this.navigation.assign(url);
    } else if (this.store.logoutFailed()) {
      this.snackbar.show(this.transloco.translate('platform.error.generic'));
    }
  }
}
