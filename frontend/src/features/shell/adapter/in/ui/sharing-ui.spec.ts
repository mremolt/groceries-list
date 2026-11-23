import { Clipboard } from '@angular/cdk/clipboard';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, type Routes, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LOGOUT, type LogoutUseCase } from '@features/session';
import { PAGE_NAVIGATION } from '@platform';
import { TechnicalError } from '@platform/domain';
import { type SizeClass, WindowSize } from '@shared/ui/layout/window-size';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { expectNoAxeViolations } from '@testing/axe';
import { itemUseCaseFakes } from '@testing/item-use-cases';
import { listUseCaseFakes, WEEK } from '@testing/list-use-cases';
import { LINK, sharingUseCaseFakes } from '@testing/sharing-use-cases';
import { provideTestTranslations } from '@testing/transloco';
import { fireEvent, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AppShell } from './app-shell';
import { ListPage } from './list-page';

const ROUTES: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: 'listen/:id',
        component: ListPage,
        data: { heading: 'shell.heading.lists', headingFromList: true },
      },
    ],
  },
];

async function setup(size: SizeClass = 'expanded') {
  const lists = listUseCaseFakes([WEEK]);
  lists.fakes.loadList.execute.mockResolvedValue(WEEK);
  const items = itemUseCaseFakes();
  const sharing = sharingUseCaseFakes();
  const copy = vi.fn<(text: string) => boolean>().mockReturnValue(true); // explicit fake (NG-TOOL-11)
  TestBed.configureTestingModule({
    providers: [
      provideRouter(ROUTES, withComponentInputBinding()),
      Snackbar,
      ...lists.providers,
      ...items.providers,
      ...sharing.providers,
      { provide: Clipboard, useValue: { copy } },
      { provide: WindowSize, useValue: { sizeClass: signal<SizeClass>(size) } },
      { provide: LOGOUT, useValue: mock<LogoutUseCase>() },
      { provide: PAGE_NAVIGATION, useValue: { assign: vi.fn() } },
      ...provideTestTranslations(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/listen/l1');
  await harness.fixture.whenStable();
  await screen.findByRole('heading', { level: 1, name: 'Wocheneinkauf' });
  return { harness, fakes: sharing.fakes, copy, snackbar: TestBed.inject(Snackbar) };
}

async function openShareDialog(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: 'Liste teilen' }));
  return await screen.findByRole('dialog', { name: '„Wocheneinkauf“ teilen' });
}

async function openRenewFromMenu(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Weitere Optionen' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Teilen-Link erneuern' }));
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'share');
});

describe('share dialog (FR-SHARE-01)', () => {
  it('shows the text, the read-only link, the renewal note and the buttons (AC1)', async () => {
    await setup();

    const dialog = await openShareDialog();

    expect(
      within(dialog).getByText(
        'Jede Person mit diesem Link und einem Konto kann der Liste beitreten und sie bearbeiten.',
      ),
    ).toBeTruthy();
    const field = await within(dialog).findByRole('textbox', { name: 'Teilen-Link' });
    expect(field).toHaveProperty('value', LINK.url);
    expect(field.hasAttribute('readonly')).toBe(true);
    expect(within(dialog).getByText(/Link an die falsche Person geschickt\?/)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Link kopieren' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Link erneuern' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Fertig' })).toBeTruthy();
    await expectNoAxeViolations(dialog);
  });

  it('never makes the link a navigable address (NFR-SEC-05, ADR 0008)', async () => {
    await setup();

    const dialog = await openShareDialog();
    await within(dialog).findByRole('textbox', { name: 'Teilen-Link' });

    expect(dialog.querySelectorAll('a[href]')).toHaveLength(0);
  });

  it('copies the link and says so (AC2)', async () => {
    const { copy, snackbar } = await setup();
    const dialog = await openShareDialog();

    await userEvent.click(await within(dialog).findByRole('button', { name: 'Link kopieren' }));

    expect(copy).toHaveBeenCalledWith(LINK.url);
    expect(snackbar.message()?.text).toBe('Link kopiert');
    expect(within(dialog).getByRole('status').textContent).toBe('Link kopiert'); // the modal hides the snackbar
  });

  it('says so when the browser refuses to copy', async () => {
    const { copy, snackbar } = await setup();
    copy.mockReturnValue(false);
    const dialog = await openShareDialog();

    await userEvent.click(await within(dialog).findByRole('button', { name: 'Link kopieren' }));

    expect(snackbar.message()?.text).toContain('Der Link konnte nicht kopiert werden');
  });

  it('has no system share button where the Web Share API is missing (AC3)', async () => {
    await setup();

    const dialog = await openShareDialog();
    await within(dialog).findByRole('button', { name: 'Link kopieren' });

    expect(within(dialog).queryByRole('button', { name: 'Teilen …' })).toBeNull();
  });

  it('offers „Teilen …“ where the Web Share API exists and hands the link to it (AC3)', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue();
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    await setup();
    const dialog = await openShareDialog();

    await userEvent.click(await within(dialog).findByRole('button', { name: 'Teilen …' }));

    expect(share).toHaveBeenCalledWith({ title: 'Wocheneinkauf', url: LINK.url });
  });

  it('shows an error with a retry when the link cannot be loaded', async () => {
    const { fakes } = await setup();
    fakes.loadShareLink.execute.mockRejectedValueOnce(new TechnicalError('boom'));
    const dialog = await openShareDialog();

    expect(await within(dialog).findByRole('alert')).toHaveProperty(
      'textContent',
      'Der Link konnte nicht geladen werden.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Erneut versuchen' }));

    expect(await within(dialog).findByRole('textbox', { name: 'Teilen-Link' })).toBeTruthy();
  });

  it('closes with „Fertig“ and returns focus to the share button', async () => {
    await setup();
    const dialog = await openShareDialog();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Fertig' }));

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Liste teilen' }));
    });
  });

  it('is operable with the keyboard alone: focus starts in the dialog, Enter copies, Esc closes it', async () => {
    const { copy } = await setup();
    const dialog = await openShareDialog();
    const copyButton = await within(dialog).findByRole('button', { name: 'Link kopieren' });

    await vi.waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
    copyButton.focus();
    await userEvent.keyboard('{Enter}');
    expect(copy).toHaveBeenCalledWith(LINK.url);
    // CDK overlays read the legacy `keyCode`, which user-event does not set
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', keyCode: 27 });

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});

describe('renew the share link (FR-SHARE-02, BR-11)', () => {
  it('asks first, renews, shows the new link in the open dialog and says so', async () => {
    const { fakes, snackbar } = await setup();
    fakes.renewShareLink.execute.mockResolvedValue({ url: 'https://einkauf.example.test/j/neu' });
    const dialog = await openShareDialog();
    await within(dialog).findByRole('textbox', { name: 'Teilen-Link' });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Link erneuern' }));
    const confirm = await screen.findByRole('dialog', { name: 'Teilen-Link erneuern?' });
    expect(
      within(confirm).getByText(
        'Der bisherige Link funktioniert danach nicht mehr. Wer schon Mitglied ist, bleibt Mitglied.',
      ),
    ).toBeTruthy();
    expect(fakes.renewShareLink.execute.mock.calls).toHaveLength(0);
    await userEvent.click(within(confirm).getByRole('button', { name: 'Erneuern' }));

    await vi.waitFor(() => {
      expect(within(dialog).getByRole('textbox', { name: 'Teilen-Link' })).toHaveProperty(
        'value',
        'https://einkauf.example.test/j/neu',
      );
    });
    expect(fakes.renewShareLink.execute.mock.calls).toEqual([['l1']]);
    expect(snackbar.message()?.text).toBe('Neuer Teilen-Link erstellt. Der alte Link funktioniert nicht mehr.');
  });

  it('keeps the link when the confirmation is cancelled', async () => {
    const { fakes } = await setup();
    const dialog = await openShareDialog();
    await within(dialog).findByRole('textbox', { name: 'Teilen-Link' });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Link erneuern' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }));

    expect(fakes.renewShareLink.execute.mock.calls).toHaveLength(0);
    expect(within(dialog).getByRole('textbox', { name: 'Teilen-Link' })).toHaveProperty('value', LINK.url);
  });

  it('renews from the ⋮ menu with the same confirmation and returns focus to the menu button (AC1)', async () => {
    const { fakes, snackbar } = await setup();
    fakes.renewShareLink.execute.mockResolvedValue({ url: 'https://einkauf.example.test/j/neu' });

    await openRenewFromMenu();
    const confirm = await screen.findByRole('dialog', { name: 'Teilen-Link erneuern?' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Erneuern' }));

    await vi.waitFor(() => {
      expect(snackbar.message()?.text).toBe('Neuer Teilen-Link erstellt. Der alte Link funktioniert nicht mehr.');
    });
    expect(fakes.renewShareLink.execute.mock.calls).toEqual([['l1']]);
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Weitere Optionen' }));
    });
  });

  it('shows the error snackbar and keeps the old link when renewing fails (FR-FB-05)', async () => {
    const { fakes, snackbar } = await setup();
    fakes.renewShareLink.execute.mockRejectedValue(new TechnicalError('boom'));
    const dialog = await openShareDialog();
    await within(dialog).findByRole('textbox', { name: 'Teilen-Link' });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Link erneuern' }));
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: 'Teilen-Link erneuern?' })).getByRole('button', {
        name: 'Erneuern',
      }),
    );

    await vi.waitFor(() => {
      expect(snackbar.message()?.text).toBe('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    });
    expect(within(dialog).getByRole('textbox', { name: 'Teilen-Link' })).toHaveProperty('value', LINK.url);
  });
});
