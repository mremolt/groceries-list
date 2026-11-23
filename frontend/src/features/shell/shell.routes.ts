import type { Routes } from '@angular/router';
import { provideSessionApi } from '@features/session';
import { provideTranslocoScope } from '@jsverse/transloco';

import { authenticatedGuard } from './adapter/in/ui/authenticated-guard';

/** Every route needs a session (the guard); titles live in the platform catalog, headings in the shell scope. */
export const SHELL_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard],
    providers: [
      provideSessionApi(),
      provideTranslocoScope({
        scope: 'shell',
        loader: { de: () => import('./adapter/in/ui/i18n/de.json') },
      }),
    ],
    loadComponent: () => import('./adapter/in/ui/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        title: 'platform.title.lists',
        data: { heading: 'shell.heading.lists' },
        loadComponent: () => import('./adapter/in/ui/lists-empty-page').then((m) => m.ListsEmptyPage),
      },
      {
        path: 'einstellungen',
        title: 'platform.title.settings',
        data: { heading: 'shell.heading.settings' },
        loadComponent: () => import('./adapter/in/ui/settings-page').then((m) => m.SettingsPage),
      },
    ],
  },
];
