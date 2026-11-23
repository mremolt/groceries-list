import { test as base } from '@playwright/test';

import { AuthPage } from './auth-page';
import { ItemsPage } from './items-page';
import { JoinPage } from './join-page';
import { ListsPage } from './lists-page';
import { SettingsPage } from './settings-page';
import { SharingPage } from './sharing-page';
import { ShellPage } from './shell-page';

/** The page objects, handed to the specs as fixtures (TS-TEST-42). Both tiers build on this. */
export const test = base.extend<{
  shell: ShellPage;
  lists: ListsPage;
  items: ItemsPage;
  sharing: SharingPage;
  settings: SettingsPage;
  join: JoinPage;
  auth: AuthPage;
}>({
  shell: async ({ page }, use) => use(new ShellPage(page)),
  lists: async ({ page }, use) => use(new ListsPage(page)),
  items: async ({ page }, use) => use(new ItemsPage(page)),
  sharing: async ({ page }, use) => use(new SharingPage(page)),
  settings: async ({ page }, use) => use(new SettingsPage(page)),
  join: async ({ page }, use) => use(new JoinPage(page)),
  auth: async ({ page }, use) => use(new AuthPage(page)),
});
