import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LOGIN_PATH, PAGE_NAVIGATION } from '@platform';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { AppIcon } from '@shared/ui/icon/app-icon';
import { LoadingIndicator } from '@shared/ui/loading/loading-indicator';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { SnackbarHost } from '@shared/ui/snackbar/snackbar-host';
import { firstValueFrom } from 'rxjs';

import { JoinStore } from './join-store';

/** Sign-up variant of the login: the BFF passes `prompt=create` to the identity provider (ADR 0003). */
const SIGN_UP_PATH = `${LOGIN_PATH}?prompt=create`;

/**
 * The join page `/j/:token` and `/j/consume` (FR-SHARE-03, FR-SHARE-04, FR-AUTH-06). Outside the shell, because a visitor
 * without a session must see it: with a session the person joins at once and the list opens with the snackbar; without
 * one the page shows the invitation and the buttons start the login or sign-up (the token waits in the server session,
 * ADR 0008). The token is read from the address once, kept in memory only and taken off the address bar when the page
 * has an answer (TS-SEC-01); it is never put into a link or browser storage.
 *
 * Layout (NG-UI-23): one column of at most 28 rem, centred, on every size class. The h1 is hidden unless it is the
 * invitation's heading; the cards below it are empty states (FR-SHARE-04 AC1).
 */
@Component({
  selector: 'app-join-page',
  imports: [AppIcon, EmptyState, LoadingIndicator, MatButton, RouterLink, SnackbarHost, TranslocoPipe],
  templateUrl: './join-page.html',
  styleUrl: './join-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinPage {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly navigation = inject(PAGE_NAVIGATION);
  private readonly snackbar = inject(Snackbar);
  private readonly transloco = inject(TranslocoService);
  protected readonly store = inject(JoinStore);

  /** The route parameter, bound as an input (NG-ARCH-14); absent on `/j/consume`. */
  readonly token = input<string>();

  constructor() {
    effect(() => {
      const token = this.token();
      untracked(() => {
        void this.run(token);
      });
    });
  }

  protected retry(): void {
    void this.run(this.token());
  }

  /** „Konto erstellen und beitreten“ (FR-AUTH-06 AC2). */
  protected signUp(): void {
    void this.leaveForLogin(SIGN_UP_PATH);
  }

  /** „Anmelden“ next to the invitation: the token is remembered first, so the join follows the login. */
  protected signIn(): void {
    void this.leaveForLogin(LOGIN_PATH);
  }

  /** „Anmelden“ on the invalid-link page: there is nothing to remember (FR-SHARE-04 AC1). */
  protected login(): void {
    this.navigation.assign(LOGIN_PATH);
  }

  private async run(token: string | undefined): Promise<void> {
    await this.store.start(token);
    const phase = this.store.phase();
    const joined = this.store.joined();
    if (phase === 'joined' && joined) {
      await this.router.navigate(['/listen', joined.listId], { replaceUrl: true }); // the token leaves the address bar
      if (!joined.alreadyMember) {
        const text = await firstValueFrom(
          this.transloco.selectTranslate<string>(
            'share.snackbar.joined',
            { name: joined.listName },
            { scope: 'shell' },
          ),
        );
        this.snackbar.show(text);
      }
    } else if (phase !== 'invitation' && phase !== 'failed') {
      this.location.replaceState('/'); // an answer is shown: the secret goes off the address bar, a reload starts over
    }
  }

  private async leaveForLogin(target: string): Promise<void> {
    if (await this.store.remember()) this.navigation.assign(target);
  }
}
