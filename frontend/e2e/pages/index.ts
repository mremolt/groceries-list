import type { Page } from '@playwright/test';

import { AuthPage } from './auth-page';
import { ItemsPage } from './items-page';
import { JoinPage } from './join-page';
import { ListsPage } from './lists-page';
import { SettingsPage } from './settings-page';
import { SharingPage } from './sharing-page';
import { ShellPage } from './shell-page';

export interface Pages {
  shell: ShellPage;
  lists: ListsPage;
  items: ItemsPage;
  sharing: SharingPage;
  settings: SettingsPage;
  join: JoinPage;
  auth: AuthPage;
}

/** The page objects of one browser page: for a second device or a second person in the same test. */
export function pagesOf(page: Page): Pages {
  return {
    shell: new ShellPage(page),
    lists: new ListsPage(page),
    items: new ItemsPage(page),
    sharing: new SharingPage(page),
    settings: new SettingsPage(page),
    join: new JoinPage(page),
    auth: new AuthPage(page),
  };
}
