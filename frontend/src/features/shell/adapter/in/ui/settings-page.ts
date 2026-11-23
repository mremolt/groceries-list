import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, submit } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ColorScheme, type ColorSchemePreference, PAGE_NAVIGATION } from '@platform';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ValidatedField } from '@shared/ui/field/validated-field';
import { AppIcon } from '@shared/ui/icon/app-icon';
import { LoadingIndicator } from '@shared/ui/loading/loading-indicator';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { combineLatest, firstValueFrom, map } from 'rxjs';

import { AccountActions } from './account-actions';
import { SettingsStore } from './settings-store';
import { ShellStore } from './shell-store';
import { ConnectionMonitor } from './sync/connection-monitor';

/** The query parameter the BFF adds when it returns from the new login for the account deletion (ADR 0003). */
const DELETE_PARAM = 'konto-loeschen';

/**
 * `/einstellungen` (FR-SET-01..04): „Profil“ (display name), „Darstellung“ (theme of this device), „Konto“ (e-mail,
 * sign-out, delete). The store holds the person and the running commands; the page shows them and forwards intent.
 *
 * Layout (NG-UI-23): one column of cards inside the shell's content width on every size class; the theme choice and the
 * rows fill the card width. Rows are at least 56 px high (NFR-USE-02).
 *
 * Focus (A11Y-21, NG-UI-33): the route moves focus to the h1; after a failed field the first invalid field is focused.
 */
@Component({
  selector: 'app-settings-page',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatDivider,
    MatButton,
    MatButtonToggleGroup,
    MatButtonToggle,
    ValidatedField,
    FormField,
    EmptyState,
    LoadingIndicator,
    AppIcon,
    TranslocoPipe,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit {
  protected readonly store = inject(SettingsStore);
  protected readonly scheme = inject(ColorScheme);
  private readonly shell = inject(ShellStore);
  private readonly actions = inject(AccountActions);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(PAGE_NAVIGATION);
  private readonly snackbar = inject(Snackbar);
  private readonly transloco = inject(TranslocoService);
  /** FR-FB-06 AC2: commands that change data are disabled while the server cannot be reached. */
  protected readonly offline = inject(ConnectionMonitor).offline;

  protected readonly model = signal({ displayName: '' });
  protected readonly profileForm = form(this.model);

  /** Selected, not translated at once: the lazy `shell` scope may still be loading when the page is created. */
  protected readonly errorMessages = toSignal(
    combineLatest([
      this.transloco.selectTranslate<string>('settings.error.required', {}, { scope: 'shell' }),
      this.transloco.selectTranslate<string>('settings.error.tooLong', {}, { scope: 'shell' }),
      this.transloco.selectTranslate<string>('platform.error.generic'),
    ]).pipe(map(([required, tooLong, generic]) => ({ required, tooLong, default: generic }))),
    { initialValue: { required: '', tooLong: '', default: '' } },
  );

  ngOnInit(): void {
    void this.start();
  }

  private async start(): Promise<void> {
    const returning = this.route.snapshot.queryParamMap.has(DELETE_PARAM);
    if (returning) {
      // the marker is consumed: a reload or a bookmark must not open the confirmation again
      await this.router.navigate([], {
        queryParams: { [DELETE_PARAM]: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    await this.load();
    // the dialog is created outside this route's translation scope: it opens once the scope's texts are there
    await firstValueFrom(this.transloco.selectTranslate<string>('settings.failed', {}, { scope: 'shell' }));
    if (returning && this.store.status() === 'ready') await this.actions.finish(() => this.deleteButton());
  }

  protected async reload(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    await this.store.load();
    const user = this.store.user();
    if (user) this.model.set({ displayName: user.displayName });
  }

  /** FR-SET-01 AC1: the name rules come back from the use case as the field error (FR-FB-04). */
  protected async saveName(): Promise<void> {
    if (this.offline()) return;
    await submit(this.profileForm, async (field) => {
      const result = await this.store.saveName(this.model().displayName);
      if (result.ok) {
        const saved = this.store.user();
        if (saved) this.model.set({ displayName: saved.displayName });
        this.snackbar.show(this.transloco.translate('shell.snackbar.saved'));
        return undefined;
      }
      if (result.reason === 'failed') {
        this.snackbar.show(this.transloco.translate('platform.error.generic'));
        return undefined;
      }
      return [{ kind: result.reason, fieldTree: field.displayName }];
    });
    if (this.profileForm.displayName().errors().length > 0) this.profileForm.displayName().focusBoundControl();
  }

  /** FR-SET-02 AC2: applies at once and is stored on this device. */
  protected chooseTheme(value: ColorSchemePreference): void {
    this.scheme.set(value);
  }

  /** FR-SET-03 AC1: the same sign-out as the app bar menu (FR-AUTH-03). */
  protected async logout(): Promise<void> {
    const url = await this.shell.logout();
    if (url) {
      this.navigation.assign(url);
    } else if (this.shell.logoutFailed()) {
      this.snackbar.show(this.transloco.translate('platform.error.generic'));
    }
  }

  protected deleteAccount(): void {
    if (this.offline()) return;
    void this.actions.start();
  }

  private deleteButton(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.row-button.destructive');
  }
}
