import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

export const SHELL_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideTranslocoScope({
        scope: 'home',
        loader: { de: () => import('./adapter/in/ui/i18n/de.json') },
      }),
    ],
    children: [
      {
        path: '',
        title: 'shell.title.home', // route titles live in the platform catalog (NG-I18N-13)
        loadComponent: () => import('./adapter/in/ui/home-page').then((m) => m.HomePage),
      },
    ],
  },
];
