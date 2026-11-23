import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ListLimitReachedError, ListNameInvalidError, ListNotFoundError } from '@features/lists';
import { LOGOUT, type LogoutUseCase } from '@features/session';
import { PAGE_NAVIGATION, type PageNavigation } from '@platform';
import { TechnicalError } from '@platform/domain';
import { type SizeClass, WindowSize } from '@shared/ui/layout/window-size';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { expectNoAxeViolations } from '@testing/axe';
import { itemUseCaseFakes } from '@testing/item-use-cases';
import { BBQ, listUseCaseFakes, WEEK } from '@testing/list-use-cases';
import { sharingUseCaseFakes } from '@testing/sharing-use-cases';
import { provideTestTranslations } from '@testing/transloco';
import { fireEvent, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AppShell } from './app-shell';
import { ListPage } from './list-page';
import { ListsEmptyPage } from './lists-empty-page';
import { SettingsPage } from './settings-page';
import { startGuard } from './start-guard';

// The routes of shell.routes.ts with the real guard and pages; only the use cases are doubles (NG-TEST-06).
const ROUTES: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [startGuard],
        component: ListsEmptyPage,
        data: { heading: 'shell.heading.lists' },
      },
      {
        path: 'listen/:id',
        component: ListPage,
        data: { heading: 'shell.heading.lists', headingFromList: true },
      },
      { path: 'einstellungen', component: SettingsPage, data: { heading: 'shell.heading.settings' } },
    ],
  },
];

async function setup(options: { size?: SizeClass; url?: string; lists?: (typeof WEEK)[] } = {}) {
  const { size = 'expanded', url = '/', lists = [WEEK, BBQ] } = options;
  const sizeClass = signal<SizeClass>(size);
  const { fakes, providers } = listUseCaseFakes(lists);
  const items = itemUseCaseFakes();
  const sharing = sharingUseCaseFakes();
  fakes.loadList.execute.mockImplementation((id) => {
    const found = lists.find((list) => list.id === id);
    return found ? Promise.resolve(found) : Promise.reject(new ListNotFoundError());
  });
  const assign = vi.fn<(address: string) => void>(); // explicit fake (NG-TOOL-11)
  const navigation: PageNavigation = { assign };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(ROUTES, withComponentInputBinding()),
      Snackbar,
      ...providers,
      ...items.providers,
      ...sharing.providers,
      { provide: WindowSize, useValue: { sizeClass } },
      { provide: LOGOUT, useValue: mock<LogoutUseCase>() },
      { provide: PAGE_NAVIGATION, useValue: navigation },
      ...provideTestTranslations(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await harness.fixture.whenStable();
  return { harness, fakes, router: TestBed.inject(Router), snackbar: TestBed.inject(Snackbar), sizeClass };
}

/** CDK overlays and the menu key manager read the legacy `keyCode`, which user-event does not set. */
async function pressKey(key: string, keyCode: number): Promise<void> {
  fireEvent.keyDown(document.activeElement ?? document.body, { key, keyCode });
  await new Promise<void>((resolve) => setTimeout(resolve));
}

async function openMenu(): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole('button', { name: 'Weitere Optionen' }));
  return await screen.findByRole('menu');
}

describe('navigation lists', () => {
  it('shows one entry per list with the open count in its accessible name (FR-NAV-02 AC1/AC3)', async () => {
    await setup({ url: '/einstellungen' });

    const nav = await screen.findByRole('navigation', { name: 'Hauptnavigation' });
    expect(await within(nav).findByRole('link', { name: 'Wocheneinkauf, 7 offen' })).toBeTruthy();
    expect(within(nav).getByRole('link', { name: 'Grillabend Samstag, 0 offen' })).toBeTruthy();
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2);
    expect(within(nav).queryByText('Noch keine Listen.')).toBeNull();
  });

  it('marks the open list as the current page', async () => {
    await setup({ url: '/listen/l2' });

    const link = await screen.findByRole('link', { name: 'Grillabend Samstag, 0 offen' });

    await expect.poll(() => link.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Wocheneinkauf, 7 offen' }).getAttribute('aria-current')).toBeNull();
  });

  it('says so when there are no lists', async () => {
    await setup({ lists: [], url: '/einstellungen' });

    expect(await screen.findByText('Noch keine Listen.')).toBeTruthy();
  });

  it('closes the modal drawer when a list is chosen (FR-NAV-02 AC4)', async () => {
    await setup({ size: 'compact', url: '/einstellungen' });
    await userEvent.click(await screen.findByRole('button', { name: 'Navigation öffnen' }));

    await userEvent.click(await screen.findByRole('link', { name: 'Wocheneinkauf, 7 offen' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' })).toBeTruthy();
    await expect.poll(() => screen.queryByRole('button', { name: 'Navigation schließen' })).toBeNull();
  });
});

describe('start screen (FR-NAV-03)', () => {
  it('opens the list the start use case chooses', async () => {
    const { router, fakes } = await setup({ lists: [WEEK, BBQ], url: '/einstellungen' });
    fakes.chooseStartList.execute.mockReturnValue('l2');

    await router.navigateByUrl('/');

    expect(router.url).toBe('/listen/l2');
    expect(await screen.findByRole('heading', { level: 1, name: 'Grillabend Samstag' })).toBeTruthy();
  });

  it('shows the empty state without lists', async () => {
    const { router } = await setup({ lists: [], url: '/' });

    expect(router.url).toBe('/');
    expect(await screen.findByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeTruthy();
  });
});

describe('list page', () => {
  it('shows the list name as the main heading and remembers the list (FR-NAV-04 AC1, FR-NAV-03)', async () => {
    const { fakes } = await setup({ url: '/listen/l1' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' })).toBeTruthy();
    expect(fakes.rememberOpened.execute.mock.calls).toEqual([['l1']]);
    expect(document.title).toContain('Wocheneinkauf');
  });

  it('shows the same text for a list that does not exist and one without access (FR-NAV-06 AC2)', async () => {
    await setup({ url: '/listen/unknown' });

    expect(await screen.findByText('Diese Liste gibt es nicht oder du hast keinen Zugriff.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Einkaufsliste' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Zu meinen Listen' }).getAttribute('href')).toBe('/');
  });

  it('offers retry when the list could not be loaded', async () => {
    const { fakes } = await setup({ url: '/einstellungen' });
    fakes.loadList.execute.mockRejectedValueOnce(new TechnicalError('down'));
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/listen/l1');

    await userEvent.click(await screen.findByRole('button', { name: 'Erneut versuchen' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' })).toBeTruthy();
  });
});

describe('„Weitere Optionen“ menu on a list (FR-NAV-05)', () => {
  it('offers the list commands, then Einstellungen and Abmelden', async () => {
    await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });

    const menu = await openMenu();

    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent.trim()),
    ).toEqual([
      'Liste umbenennen',
      'Teilen-Link erneuern',
      'Liste verlassen',
      'Liste löschen',
      'Einstellungen',
      'Abmelden',
    ]);
  });

  it('has no list commands outside a list', async () => {
    await setup({ url: '/einstellungen' });

    const menu = await openMenu();

    expect(within(menu).queryByRole('menuitem', { name: 'Liste löschen' })).toBeNull();
  });

  it('moves between entries with the arrow keys, Home and End, and closes with Esc returning focus (NFR-A11Y-04)', async () => {
    await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
    const button = await screen.findByRole('button', { name: 'Weitere Optionen' });
    await userEvent.click(button);
    const items = within(await screen.findByRole('menu')).getAllByRole('menuitem');

    await pressKey('ArrowDown', 40);
    expect(document.activeElement).toBe(items[1]);
    await pressKey('End', 35);
    expect(document.activeElement).toBe(items.at(-1));
    await pressKey('Home', 36);
    expect(document.activeElement).toBe(items[0]);
    await pressKey('ArrowUp', 38);
    expect(document.activeElement).toBe(items.at(-1));
    await pressKey('Escape', 27);

    await expect.poll(() => document.activeElement).toBe(button);
  });
});

describe('create a list (FR-LIST-01)', () => {
  it('opens the dialog from „Neue Liste“, creates the list, opens it and says so', async () => {
    const { fakes, router, snackbar } = await setup({ url: '/einstellungen' });
    fakes.createList.execute.mockResolvedValue({ id: 'l3', name: 'Party', openCount: 0, revision: 1 });
    fakes.loadList.execute.mockResolvedValue({ id: 'l3', name: 'Party', openCount: 0, revision: 1 });

    await userEvent.click((await screen.findAllByRole('button', { name: 'Neue Liste' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Neue Liste' });
    const field = within(dialog).getByLabelText('Name der Liste');
    await expect.poll(() => document.activeElement).toBe(field);
    await userEvent.type(field, '  Party {Enter}');

    await expect.poll(() => router.url).toBe('/listen/l3');
    expect(fakes.createList.execute.mock.calls).toEqual([['  Party ']]);
    expect(snackbar.message()?.text).toBe('Liste erstellt');
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the error with „Fehler:“ and keeps the dialog when the name is empty (FR-LIST-01 AC3)', async () => {
    const { fakes } = await setup({ url: '/einstellungen' });
    fakes.createList.execute.mockImplementation(() => Promise.reject(new ListNameInvalidError('required')));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Neue Liste' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Neue Liste' });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Erstellen' }));

    expect(await within(dialog).findByText('Fehler: Bitte gib einen Namen ein.')).toBeTruthy();
    const field = within(dialog).getByLabelText('Name der Liste');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    await expect.poll(() => document.activeElement).toBe(field);
  });

  it('shows a clear message when the list limit is reached (BR-12)', async () => {
    const { fakes } = await setup({ url: '/einstellungen' });
    fakes.createList.execute.mockRejectedValue(new ListLimitReachedError());
    await userEvent.click((await screen.findAllByRole('button', { name: 'Neue Liste' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Neue Liste' });
    await userEvent.type(within(dialog).getByLabelText('Name der Liste'), 'Noch eine{Enter}');

    expect(await within(dialog).findByText(/Du bist schon in 100 Listen/)).toBeTruthy();
  });

  it('keeps the typed text and shows the generic error when saving fails (FR-FB-05 AC2)', async () => {
    const { fakes } = await setup({ url: '/einstellungen' });
    fakes.createList.execute.mockRejectedValue(new TechnicalError('down'));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Neue Liste' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Neue Liste' });

    await userEvent.type(within(dialog).getByLabelText('Name der Liste'), 'Party{Enter}');

    expect(await within(dialog).findByText('Das hat nicht geklappt. Bitte versuche es noch einmal.')).toBeTruthy();
    expect(within(dialog).getByLabelText<HTMLInputElement>('Name der Liste').value).toBe('Party');
  });

  it('keeps typed text on Esc and says so; „Abbrechen“ discards it (UI-21)', async () => {
    await setup({ url: '/einstellungen' });
    await userEvent.click((await screen.findAllByRole('button', { name: 'Neue Liste' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Neue Liste' });
    await userEvent.type(within(dialog).getByLabelText('Name der Liste'), 'Par');

    await pressKey('Escape', 27);

    expect(await within(dialog).findByText(/Du hast eine Eingabe gemacht/)).toBeTruthy();
    expect(screen.getByRole('dialog')).not.toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });

  it('closes at once on Esc when nothing was typed (FR-FB-03 AC1)', async () => {
    await setup({ url: '/einstellungen' });
    await userEvent.click((await screen.findAllByRole('button', { name: 'Neue Liste' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Neue Liste' });
    await expect.poll(() => document.activeElement).toBe(within(dialog).getByLabelText('Name der Liste'));

    await pressKey('Escape', 27);

    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
  });
});

describe('rename a list (FR-LIST-02)', () => {
  it('pre-fills the name, saves, shows the new name as the heading and says so', async () => {
    const { fakes, snackbar } = await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
    fakes.renameList.execute.mockResolvedValue({ ...WEEK, name: 'Großeinkauf' });
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Liste umbenennen' }));

    const dialog = await screen.findByRole('dialog', { name: 'Liste umbenennen' });
    expect(within(dialog).getByText('Der neue Name ist für alle Mitglieder sichtbar.')).toBeTruthy();
    const field = within(dialog).getByLabelText<HTMLInputElement>('Name der Liste');
    expect(field.value).toBe('Wocheneinkauf');
    await userEvent.clear(field);
    await userEvent.type(field, 'Großeinkauf');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Großeinkauf' })).toBeTruthy();
    expect(fakes.renameList.execute.mock.calls).toEqual([['l1', 'Großeinkauf']]);
    await expect.poll(() => snackbar.message()?.text).toBe('Gespeichert');
  });

  it('returns focus to the ⋮ button after the dialog closes, because the menu item is gone (NG-UI-33)', async () => {
    const { fakes } = await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
    fakes.renameList.execute.mockResolvedValue(WEEK);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Liste umbenennen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Liste umbenennen' });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));

    await expect.poll(() => document.activeElement).toBe(screen.getByRole('button', { name: 'Weitere Optionen' }));
  });
});

describe('delete and leave (FR-LIST-03, FR-LIST-04)', () => {
  it('asks first, then deletes for everyone, shows the next list and says so', async () => {
    const { fakes, router, snackbar } = await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Liste löschen' }));

    const dialog = await screen.findByRole('dialog', { name: '„Wocheneinkauf“ löschen?' });
    expect(within(dialog).getByText(/Die Liste wird für alle Mitglieder gelöscht/)).toBeTruthy();
    expect(fakes.deleteList.execute.mock.calls).toHaveLength(0);
    fakes.loadMyLists.execute.mockResolvedValue([BBQ]);
    fakes.chooseStartList.execute.mockReturnValue('l2');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    await expect.poll(() => router.url).toBe('/listen/l2');
    expect(fakes.deleteList.execute.mock.calls).toEqual([['l1']]);
    expect(snackbar.message()?.text).toBe('Liste gelöscht');
  });

  it('keeps everything when the confirmation is cancelled', async () => {
    const { fakes, router } = await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Liste löschen' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }));

    expect(fakes.deleteList.execute.mock.calls).toHaveLength(0);
    expect(router.url).toBe('/listen/l1');
    await expect.poll(() => document.activeElement).toBe(screen.getByRole('button', { name: 'Weitere Optionen' }));
  });

  it('leaves the list, shows the empty state for the last list and says so', async () => {
    const { fakes, router, snackbar } = await setup({ lists: [WEEK], url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Liste verlassen' }));
    const dialog = await screen.findByRole('dialog', { name: '„Wocheneinkauf“ verlassen?' });
    expect(within(dialog).getByText(/Wenn du das letzte Mitglied bist, wird sie gelöscht/)).toBeTruthy();
    fakes.loadMyLists.execute.mockResolvedValue([]);
    fakes.chooseStartList.execute.mockReturnValue(null);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Verlassen' }));

    await expect.poll(() => router.url).toBe('/');
    expect(fakes.leaveList.execute.mock.calls).toEqual([['l1']]);
    expect(snackbar.message()?.text).toBe('Du hast die Liste verlassen');
    expect(await screen.findByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeTruthy();
  });

  it('shows the generic error and stays on the list when deleting fails', async () => {
    const { fakes, router, snackbar } = await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
    fakes.deleteList.execute.mockRejectedValue(new TechnicalError('down'));
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Liste löschen' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Löschen' }));

    await expect.poll(() => snackbar.message()?.text).toBe('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    expect(router.url).toBe('/listen/l1');
  });
});

describe('accessibility', () => {
  it('has no violations on a list page with the drawer and its lists', async () => {
    const { harness } = await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });

    await expectNoAxeViolations(harness.fixture.nativeElement as HTMLElement);
  });

  it('has no violations on the not-found page', async () => {
    await setup({ url: '/listen/unknown' });
    await screen.findByText('Diese Liste gibt es nicht oder du hast keinen Zugriff.');

    await expectNoAxeViolations(document.body);
  });

  it('has no violations with the list menu open', async () => {
    await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
    const menu = await openMenu();

    await expectNoAxeViolations(menu);
  });

  it('has no violations with the create dialog open, with an error', async () => {
    const { fakes } = await setup({ url: '/einstellungen' });
    fakes.createList.execute.mockImplementation(() => Promise.reject(new ListNameInvalidError('required')));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Neue Liste' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Neue Liste' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Erstellen' }));
    await within(dialog).findByText('Fehler: Bitte gib einen Namen ein.');

    await expectNoAxeViolations(dialog);
  });

  it('has no violations with the rename and the delete dialogs open', async () => {
    await setup({ url: '/listen/l1' });
    await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Liste löschen' }));
    const dialog = await screen.findByRole('dialog', { name: '„Wocheneinkauf“ löschen?' });

    await expectNoAxeViolations(dialog);
  });

  it('has no violations on the empty start page', async () => {
    const { harness } = await setup({ lists: [], url: '/' });
    await screen.findByRole('heading', { level: 2, name: 'Noch keine Listen' });

    await expectNoAxeViolations(harness.fixture.nativeElement as HTMLElement);
  });
});
