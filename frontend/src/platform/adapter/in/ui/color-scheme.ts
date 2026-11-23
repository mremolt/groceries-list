import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ColorSchemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const PREFERENCES: readonly ColorSchemePreference[] = ['system', 'light', 'dark'];

/**
 * The theme preference of this device (FR-SET-02): `system` follows `prefers-color-scheme` through
 * `color-scheme: light dark` in the theme; `light` and `dark` set `data-color-scheme` on `<html>`. Stored per device
 * in localStorage (the value is neither a token nor personal data, TS-SEC-01). Storage may be blocked: the app then
 * works with the in-memory value.
 */
@Injectable()
export class ColorScheme {
  private readonly document = inject(DOCUMENT);
  private readonly preferenceState = signal<ColorSchemePreference>(this.read());

  readonly preference = this.preferenceState.asReadonly();

  constructor() {
    effect(() => {
      const preference = this.preferenceState();
      const root = this.document.documentElement;
      if (preference === 'system') {
        root.removeAttribute('data-color-scheme');
      } else {
        root.setAttribute('data-color-scheme', preference);
      }
    });
  }

  set(preference: ColorSchemePreference): void {
    this.preferenceState.set(preference);
    try {
      this.storage()?.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage blocked or full: the choice still applies for this page load.
    }
  }

  private read(): ColorSchemePreference {
    try {
      const stored = this.storage()?.getItem(STORAGE_KEY);
      return PREFERENCES.find((p) => p === stored) ?? 'system';
    } catch {
      return 'system';
    }
  }

  private storage(): Storage | undefined {
    return this.document.defaultView?.localStorage;
  }
}
