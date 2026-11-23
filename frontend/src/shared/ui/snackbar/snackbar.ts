import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** FR-FB-02 AC2: a snackbar stays at least this long; hovering or focusing it holds it (WCAG 2.2.1). */
export const SNACKBAR_DURATION_MS = 10_000;

export interface SnackbarMessage {
  readonly id: number;
  readonly text: string;
}

/**
 * One snackbar at a time; a new message replaces the current one (FR-FB-02 AC4). The host renders it in a visible
 * `role="status"` region, which announces it politely without taking focus (UI-15, NFR-A11Y-07).
 */
@Injectable()
export class Snackbar {
  private readonly nextId = signal(1);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly message = signal<SnackbarMessage | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.clearTimer();
    });
  }

  show(text: string): void {
    const id = this.nextId();
    this.nextId.set(id + 1);
    this.message.set({ id, text });
    this.startTimer();
  }

  dismiss(): void {
    this.clearTimer();
    this.message.set(null);
  }

  /** Hover or keyboard focus on the snackbar: the countdown stops. */
  pause(): void {
    this.clearTimer();
  }

  /** The countdown starts again with the full duration, so the message never disappears early. */
  resume(): void {
    if (this.message()) this.startTimer();
  }

  private startTimer(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.dismiss();
    }, SNACKBAR_DURATION_MS);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
