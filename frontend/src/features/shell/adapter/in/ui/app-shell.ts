import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  type OnInit,
  viewChild,
} from '@angular/core';
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

import { ListActions } from './list-actions';
import { ListsStore } from './lists-store';
import { ShellStore } from './shell-store';

interface PageHeading {
  /** The translation key of the page heading, set as `data.heading` on the route (FR-NAV-04 AC1). */
  readonly key: string;
  /** The page is a list: its name is the heading as soon as it is known (FR-NAV-04 AC1). */
  readonly fromList: boolean;
}

function pageHeadingOf(route: ActivatedRouteSnapshot): PageHeading {
  let current: ActivatedRouteSnapshot | null = route;
  let key = '';
  let fromList = false;
  while (current) {
    const heading: unknown = current.data['heading'];
    if (typeof heading === 'string') key = heading;
    fromList = fromList || current.data['headingFromList'] === true;
    current = current.firstChild;
  }
  return { key, fromList };
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
export class AppShell implements OnInit {
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly navigation = inject(PAGE_NAVIGATION);
  private readonly snackbar = inject(Snackbar);
  protected readonly store = inject(ShellStore);
  protected readonly lists = inject(ListsStore);
  private readonly actions = inject(ListActions);
  protected readonly windowSize = inject(WindowSize);

  protected readonly drawer = viewChild.required(MatSidenav);
  private readonly menuButton = viewChild<unknown, ElementRef<HTMLElement>>('menuButton', { read: ElementRef });

  protected readonly expanded = computed(() => this.windowSize.sizeClass() === 'expanded');
  private readonly pageHeading = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => pageHeadingOf(this.router.routerState.snapshot.root)),
    ),
    { initialValue: { key: '', fromList: false } },
  );

  protected readonly headingKey = computed(() => this.pageHeading().key);
  /** The h1 on a list page once the list is loaded: its name; otherwise the page's own heading (`headingKey`). */
  protected readonly listName = computed(() =>
    this.pageHeading().fromList ? (this.lists.currentList()?.name ?? null) : null,
  );
  /** The ⋮ menu offers the list commands only on a list that was found. */
  protected readonly onList = computed(() => this.pageHeading().fromList && this.lists.currentList() !== null);

  ngOnInit(): void {
    void this.lists.ensureLoaded(); // the drawer needs the lists on every page, also on a deep link
  }

  /**
   * The drawer is closed: focus returns to the menu button (FR-NAV-02 AC4, NG-UI-33). Without animations (reduced
   * motion) the browser drops focus from the hidden drawer to the body after Material's restore ran, so the restore
   * is made explicit. Focus that already moved on (the page heading after choosing an entry) stays.
   */
  protected restoreFocus(): void {
    const active = document.activeElement;
    const lost = !active || active === document.body || active.closest('mat-sidenav') !== null;
    if (lost) this.menuButton()?.nativeElement.focus();
  }

  /** FR-NAV-02 AC4: selecting an entry closes the modal drawer. */
  protected closeIfModal(): void {
    if (!this.expanded()) void this.drawer().close();
  }

  protected newList(): void {
    this.closeIfModal();
    void this.actions.create(() => this.menuButton()?.nativeElement ?? document.querySelector<HTMLElement>('h1'));
  }

  protected renameList(): void {
    void this.actions.renameCurrent(() => this.moreButton());
  }

  protected leaveList(): void {
    void this.actions.leaveCurrent(() => this.moreButton());
  }

  protected deleteList(): void {
    void this.actions.deleteCurrent(() => this.moreButton());
  }

  protected retryLists(): void {
    void this.lists.reload();
  }

  private moreButton(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.more-button');
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
