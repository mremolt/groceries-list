import { ChangeDetectionStrategy, Component, effect, inject, input, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { LoadingIndicator } from '@shared/ui/loading/loading-indicator';

import { ListsStore } from './lists-store';

/**
 * A list (`/listen/:id`, FR-NAV-06 AC1). The name is the page's h1 in the app bar. The items arrive with M3; until then
 * the body only says where they will be. A list that does not exist and one the person may not see show the same
 * page (FR-NAV-06 AC2, BR-01).
 *
 * Layout (NG-UI-23): one column on every size class inside the shell's content width.
 */
@Component({
  selector: 'app-list-page',
  imports: [EmptyState, LoadingIndicator, MatButton, RouterLink, TranslocoPipe],
  templateUrl: './list-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListPage {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  protected readonly store = inject(ListsStore);

  /** The route parameter, bound as an input (NG-ARCH-14). */
  readonly id = input.required<string>();

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        void this.store.open(id);
      });
    });
    // the document title follows the list (A11Y-21): a synchronisation with a non-Angular API (NG-ARCH-08)
    effect(() => {
      const current = this.store.current();
      const app = this.transloco.translate('platform.appName');
      if (current.status === 'found') this.title.setTitle(`${current.list.name} | ${app}`);
      if (current.status === 'notFound') {
        this.title.setTitle(`${this.transloco.translate('shell.list.notFound.title')} | ${app}`);
      }
    });
  }

  protected reload(): void {
    void this.store.open(this.id());
  }
}
