import type { Routes } from '@angular/router';
import { provideListsApi } from '@features/lists';
import { provideSessionApi } from '@features/session';
import { provideTranslocoScope } from '@jsverse/transloco';

import { authenticatedGuard } from './adapter/in/ui/authenticated-guard';
import { ListActions } from './adapter/in/ui/list-actions';
import { ListsStore } from './adapter/in/ui/lists-store';
import { startGuard } from './adapter/in/ui/start-guard';

/** Every route needs a session (the guard); titles live in the platform catalog, headings in the shell scope. */
export const SHELL_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard],
    providers: [
      provideSessionApi(),
      provideListsApi(),
      ListsStore, // NG-STATE-12: route level, shared by the drawer, the app bar menu and the pages
      ListActions,
      provideTranslocoScope({
        scope: 'shell',
        loader: { de: () => import('./adapter/in/ui/i18n/de.json') },
      }),
    ],
    loadComponent: () => import('./adapter/in/ui/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [startGuard],
        title: 'platform.title.lists',
        data: { heading: 'shell.heading.lists' },
        loadComponent: () => import('./adapter/in/ui/lists-empty-page').then((m) => m.ListsEmptyPage),
      },
      {
        path: 'listen/:id',
        title: 'platform.title.lists',
        data: { heading: 'shell.heading.lists', headingFromList: true },
        loadComponent: () => import('./adapter/in/ui/list-page').then((m) => m.ListPage),
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
