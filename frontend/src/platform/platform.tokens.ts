import { DOCUMENT } from '@angular/common';
import { inject, InjectionToken } from '@angular/core';

import type { ReportErrorUseCase } from './ports/in/report-error-use-case';
import type { Clock } from './ports/out/clock';
import type { PageNavigation } from './ports/out/page-navigation';
import type { RuntimeConfig } from './ports/out/runtime-config';

/** The only `Date.now()` outside specs (NG-ARCH-24, NG-TOOL-12). */
export const CLOCK = new InjectionToken<Clock>('Clock', {
  providedIn: 'root',
  factory: () => ({ now: () => Date.now() }),
});

/** Per-environment values from `/config.json`, loaded before bootstrap (NG-CFG-04). */
export const RUNTIME_CONFIG = new InjectionToken<Readonly<RuntimeConfig>>('RuntimeConfig');

/** Reports an unexpected error once (NG-OBS-02). */
export const REPORT_ERROR = new InjectionToken<ReportErrorUseCase>('ReportError');

/** The BFF endpoint that starts the OIDC login (ADR 0002); the only login target the SPA ever navigates to. */
export const LOGIN_PATH = '/oauth2/authorization/keycloak';

/** Whole-page navigation (login, IdP end-session); a token so that tests never leave the page. */
export const PAGE_NAVIGATION = new InjectionToken<PageNavigation>('PageNavigation', {
  providedIn: 'root',
  factory: () => {
    const location = inject(DOCUMENT).location;
    return {
      assign: (url: string) => {
        location.assign(url);
      },
    };
  },
});
