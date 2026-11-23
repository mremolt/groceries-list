import { DOCUMENT } from '@angular/common';
import { afterNextRender, inject, Injectable, Injector } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * After a route change focus moves to the new page's main heading (A11Y-21, NG-UI-31). Started once by the app root.
 * The first navigation keeps the browser's natural start; navigations with `replaceUrl` or `state.keepFocus` skip it.
 */
@Injectable()
export class RouteFocus {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private first = true;

  start(): void {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      const navigation = this.router.lastSuccessfulNavigation();
      const skip =
        this.first || navigation?.extras.replaceUrl === true || navigation?.extras.state?.['keepFocus'] === true;
      this.first = false;
      if (!skip) {
        afterNextRender(
          () => {
            this.focusMainHeading();
          },
          { injector: this.injector },
        );
      }
    });
  }

  private focusMainHeading(): void {
    const heading = this.document.querySelector<HTMLElement>('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }
}
