import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, computed, inject, type OnInit, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type { ShareLink } from '@features/sharing';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppIcon } from '@shared/ui/icon/app-icon';
import { LoadingIndicator } from '@shared/ui/loading/loading-indicator';
import { Snackbar } from '@shared/ui/snackbar/snackbar';

export interface ShareDialogData {
  readonly listName: string;
  /** Loads the current link of the list. */
  readonly load: () => Promise<ShareLink>;
  /** Asks, renews and says so; answers the new link, or `undefined` when nothing changed (FR-SHARE-02). */
  readonly renew: () => Promise<ShareLink | undefined>;
}

type LinkState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly link: ShareLink }
  | { readonly status: 'failed' };

/**
 * „‹Name›“ teilen (FR-SHARE-01): the read-only link, „Link kopieren“ (snackbar „Link kopiert“), „Teilen …“ only where
 * the browser has the Web Share API, „Link erneuern“ and „Fertig“. The title is the dialog's accessible name; focus
 * starts on the copy button once the link is there. The link is a value in a read-only text field, never a router
 * link or an `href` (NFR-SEC-05, ADR 0008: it carries the secret token).
 *
 * Layout (NG-UI-23): a Material dialog, the field full width and the buttons wrapping on every size class.
 */
@Component({
  selector: 'app-share-dialog',
  imports: [
    AppIcon,
    LoadingIndicator,
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatInput,
    MatLabel,
    TranslocoPipe,
  ],
  templateUrl: './share-dialog.html',
  styleUrl: './share-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareDialog implements OnInit {
  private readonly clipboard = inject(Clipboard);
  private readonly snackbar = inject(Snackbar);
  private readonly transloco = inject(TranslocoService);
  protected readonly data = inject<ShareDialogData>(MAT_DIALOG_DATA);

  protected readonly state = signal<LinkState>({ status: 'loading' });
  protected readonly renewing = signal(false);
  /** Said politely to screen readers: the snackbar behind the modal dialog is hidden from them (A11Y-20). */
  protected readonly announcement = signal('');
  protected readonly link = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.link.url : '';
  });
  /** FR-SHARE-01 AC3: the system share sheet exists mainly on phones. */
  protected readonly canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      this.state.set({ status: 'ready', link: await this.data.load() });
    } catch {
      this.state.set({ status: 'failed' });
    }
  }

  protected copy(): void {
    const copied = this.clipboard.copy(this.link());
    this.say(copied ? 'shell.share.snackbar.copied' : 'shell.share.snackbar.copyFailed');
  }

  protected async shareNatively(): Promise<void> {
    try {
      await navigator.share({ title: this.data.listName, url: this.link() });
    } catch {
      // the person closed the share sheet: nothing happened, nothing to say
    }
  }

  protected async renew(): Promise<void> {
    this.renewing.set(true);
    try {
      const renewed = await this.data.renew();
      if (renewed) {
        this.state.set({ status: 'ready', link: renewed });
        this.announcement.set(this.transloco.translate('shell.share.snackbar.renewed'));
      }
    } finally {
      this.renewing.set(false);
    }
  }

  /** The snackbar shows the message to everyone; the status line in the dialog makes it audible (FR-FB-02, A11Y-20). */
  private say(key: string): void {
    const text = this.transloco.translate(key);
    this.snackbar.show(text);
    this.announcement.set(text);
  }

  /** Selecting the whole link on focus makes a manual copy one keystroke (the read-only field stays focusable). */
  protected selectAll(event: Event): void {
    if (event.target instanceof HTMLInputElement) event.target.select();
  }
}
