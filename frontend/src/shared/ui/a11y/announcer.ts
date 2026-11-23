import { LiveAnnouncer } from '@angular/cdk/a11y';
import { inject, Injectable } from '@angular/core';

/**
 * Announces a status message to screen readers without moving focus (UI-15, NG-UI-30, WCAG 4.1.3). An abstract class is
 * the DI token, so tests mock it (NG-TEST-12). Use a visible `role="status"` region first; this is the fallback.
 */
export abstract class Announcer {
  abstract announce(message: string): void;
}

@Injectable()
export class CdkAnnouncer extends Announcer {
  private readonly live = inject(LiveAnnouncer);

  announce(message: string): void {
    void this.live.announce(message, 'polite');
  }
}
