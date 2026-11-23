import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/**
 * What the page is doing, as far as synchronisation cares (FR-SYNC-01 AC2/AC3): visible or hidden, and the moments to
 * look at the server at once (the tab becomes visible, the window gets the focus, the network is back). A
 * synchronisation with non-Angular browser events (NG-ARCH-08), kept in one place so the pollers stay testable.
 */
@Injectable({ providedIn: 'root' })
export class PageActivity {
  private readonly document = inject(DOCUMENT);
  private readonly resumeListeners = new Set<() => void>();
  private readonly offlineListeners = new Set<() => void>();

  private readonly visibleState = signal(!this.document.hidden);
  readonly visible = this.visibleState.asReadonly();

  constructor() {
    const view = this.document.defaultView;
    const onVisibility = (): void => {
      this.visibleState.set(!this.document.hidden);
      if (!this.document.hidden) this.notify(this.resumeListeners);
    };
    const onResume = (): void => {
      this.notify(this.resumeListeners);
    };
    const onOffline = (): void => {
      this.notify(this.offlineListeners);
    };
    this.document.addEventListener('visibilitychange', onVisibility);
    view?.addEventListener('focus', onResume);
    view?.addEventListener('online', onResume);
    view?.addEventListener('offline', onOffline);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibility);
      view?.removeEventListener('focus', onResume);
      view?.removeEventListener('online', onResume);
      view?.removeEventListener('offline', onOffline);
      this.resumeListeners.clear();
      this.offlineListeners.clear();
    });
  }

  /** Calls `listener` whenever the page should look at the server at once; returns the way to stop. */
  onResume(listener: () => void): () => void {
    return this.subscribe(this.resumeListeners, listener);
  }

  /** Calls `listener` when the browser says it has no network. */
  onOffline(listener: () => void): () => void {
    return this.subscribe(this.offlineListeners, listener);
  }

  private subscribe(set: Set<() => void>, listener: () => void): () => void {
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  private notify(set: Set<() => void>): void {
    for (const listener of [...set]) listener();
  }
}
