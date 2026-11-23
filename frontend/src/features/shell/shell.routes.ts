import type { Routes } from '@angular/router';
import { provideItemsApi } from '@features/items';
import { provideListsApi } from '@features/lists';
import { provideSessionApi } from '@features/session';
import { provideSharingApi } from '@features/sharing';
import { provideTranslocoScope } from '@jsverse/transloco';

import { authenticatedGuard } from './adapter/in/ui/authenticated-guard';
import { ItemsStore } from './adapter/in/ui/items-store';
import { JoinStore } from './adapter/in/ui/join-store';
import { ListActions } from './adapter/in/ui/list-actions';
import { ListsStore } from './adapter/in/ui/lists-store';
import { ShareActions } from './adapter/in/ui/share-actions';
import { startGuard } from './adapter/in/ui/start-guard';

/** Every route needs a session (the guard); titles live in the platform catalog, headings in the shell scope. */
export const SHELL_ROUTES: Routes = [
  // Share links (FR-SHARE-03/04, FR-AUTH-06, ADR 0008): outside the shell and its guard, because a visitor without a
  // session must see the invitation. `consume` (back from the login, no token in the address) comes first.
  {
    path: 'j',
    providers: [
      provideSessionApi(),
      provideSharingApi(),
      JoinStore, // NG-STATE-12: route level
      provideTranslocoScope({
        scope: 'shell',
        loader: { de: () => import('./adapter/in/ui/i18n/de.json') },
      }),
    ],
    title: 'platform.title.join',
    children: [
      {
        path: 'consume',
        canActivate: [authenticatedGuard],
        loadComponent: () => import('./adapter/in/ui/join-page').then((m) => m.JoinPage),
      },
      {
        path: ':token',
        loadComponent: () => import('./adapter/in/ui/join-page').then((m) => m.JoinPage),
      },
    ],
  },
  {
    path: '',
    canActivate: [authenticatedGuard],
    providers: [
      provideSessionApi(),
      provideListsApi(),
      provideItemsApi(),
      provideSharingApi(),
      ListsStore, // NG-STATE-12: route level, shared by the drawer, the app bar menu and the pages
      ItemsStore, // route level too: the items of the open list (NG-STATE-12)
      ListActions,
      ShareActions,
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
