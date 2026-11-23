import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DisplayNameInvalidError, LOGOUT, type LogoutUseCase, ReauthenticationRequiredError } from '@features/session';
import { ColorScheme, LOGIN_PATH, PAGE_NAVIGATION } from '@platform';
import { TechnicalError } from '@platform/domain';
import { type SizeClass, WindowSize } from '@shared/ui/layout/window-size';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { provideTestAnnouncer } from '@testing/announcer';
import { expectNoAxeViolations } from '@testing/axe';
import { itemUseCaseFakes } from '@testing/item-use-cases';
import { listUseCaseFakes } from '@testing/list-use-cases';
import { MARA, sessionUseCaseFakes } from '@testing/session-use-cases';
import { sharingUseCaseFakes } from '@testing/sharing-use-cases';
import { provideTestTranslations } from '@testing/transloco';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AccountActions } from './account-actions';
import { AppShell } from './app-shell';
import { SettingsPage } from './settings-page';
import { SettingsStore } from './settings-store';
import { ConnectionMonitor } from './sync/connection-monitor';

const ROUTES: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: 'einstellungen',
        providers: [SettingsStore, AccountActions],
        component: SettingsPage,
        data: { heading: 'shell.heading.settings' },
      },
    ],
  },
];

const REAUTH_URL = `${LOGIN_PATH}?reauth=1`;
const END_SESSION = 'http://keycloak.localhost:8180/realms/groceries/protocol/openid-connect/logout';

async function setup(options: { url?: string; size?: SizeClass; loadError?: Error } = {}) {
  const session = sessionUseCaseFakes();
  if (options.loadError) session.fakes.loadUser.execute.mockRejectedValue(options.loadError);
  const logout = mock<LogoutUseCase>();
  logout.execute.mockResolvedValue(END_SESSION);
  const assign = vi.fn<(url: string) => void>();
  const offline = signal(false);
  const monitor = { offline: offline.asReadonly(), reportFailure: vi.fn(), reportSuccess: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(ROUTES),
      Snackbar,
      ColorScheme,
      ...listUseCaseFakes([]).providers,
      ...itemUseCaseFakes().providers,
      ...sharingUseCaseFakes().providers,
      ...session.providers,
      { provide: ConnectionMonitor, useValue: monitor },
      { provide: WindowSize, useValue: { sizeClass: signal<SizeClass>(options.size ?? 'expanded') } },
      { provide: LOGOUT, useValue: logout },
      { provide: PAGE_NAVIGATION, useValue: { assign } },
      ...provideTestAnnouncer(),
      ...provideTestTranslations(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(options.url ?? '/einstellungen');
  await harness.fixture.whenStable();
  return {
    harness,
    fakes: session.fakes,
    logout,
    assign,
    goOffline: () => {
      offline.set(true);
    },
    snackbar: TestBed.inject(Snackbar),
    router: TestBed.inject(Router),
  };
}

async function ready() {
  const context = await setup();
  await screen.findByLabelText('Anzeigename');
  return context;
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-color-scheme');
});

describe('settings page', () => {
  it('shows the three cards with the name, the theme and the e-mail address (FR-SET-01..03)', async () => {
    await ready();

    expect(screen.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Profil' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Darstellung' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Konto' })).toBeTruthy();
    expect(screen.getByLabelText('Anzeigename')).toHaveProperty('value', 'Mara');
    expect(screen.getByText('So wirst du in der App angezeigt.')).toBeTruthy();
    expect(screen.getByText('E-Mail-Adresse')).toBeTruthy();
    expect(screen.getByText('mara@beispiel.de')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Konto löschen' })).toBeTruthy();
  });

  it('has no accessibility violations (A11Y-05)', async () => {
    const { harness } = await ready();

    await expectNoAxeViolations(harness.fixture.nativeElement as Element);
  });

  it('shows a retry when the person cannot be loaded, and the form after it worked', async () => {
    const { fakes } = await setup({ loadError: new TechnicalError('down') });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Die Einstellungen konnten nicht geladen werden.' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Anzeigename')).toBeNull();
    fakes.loadUser.execute.mockResolvedValue(MARA);
    await userEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    expect(await screen.findByLabelText('Anzeigename')).toHaveProperty('value', 'Mara');
  });
});

describe('display name (FR-SET-01)', () => {
  it('saves the trimmed name and says „Gespeichert“ (AC1)', async () => {
    const { fakes, snackbar } = await ready();
    const field = screen.getByLabelText('Anzeigename');

    await userEvent.clear(field);
    await userEvent.type(field, 'Mara K');
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(fakes.updateName.execute.mock.calls).toEqual([['Mara K']]);
    await vi.waitFor(() => {
      expect(snackbar.message()?.text).toBe('Gespeichert');
    });
  });

  it.each([
    ['required', 'Fehler: Bitte gib einen Anzeigenamen ein.'],
    ['tooLong', 'Fehler: Der Anzeigename darf höchstens 50 Zeichen lang sein.'],
  ] as const)(
    'shows the field error for a refused name (%s) and keeps the text (AC1, FR-FB-04)',
    async (problem, text) => {
      const { fakes } = await ready();
      fakes.updateName.execute.mockRejectedValue(new DisplayNameInvalidError(problem));
      const field = screen.getByLabelText('Anzeigename');

      await userEvent.clear(field);
      await userEvent.type(field, 'x');
      await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

      expect(await screen.findByText(text)).toBeTruthy();
      expect(field).toHaveProperty('value', 'x');
      expect(document.activeElement).toBe(field);
      expect(field.getAttribute('aria-invalid')).toBe('true');
    },
  );

  it('keeps the typed name and shows the error snackbar when saving fails (FR-FB-05)', async () => {
    const { fakes, snackbar } = await ready();
    fakes.updateName.execute.mockRejectedValue(new TechnicalError('down'));
    const field = screen.getByLabelText('Anzeigename');

    await userEvent.type(field, 'a');
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await vi.waitFor(() => {
      expect(snackbar.message()?.text).toBe('Das hat nicht geklappt. Bitte versuche es noch einmal.');
    });
    expect(field).toHaveProperty('value', 'Maraa');
  });

  it('is disabled while offline (FR-FB-06 AC2)', async () => {
    const { goOffline, fakes } = await ready();

    goOffline();
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(screen.getByRole('button', { name: 'Speichern' }).getAttribute('aria-disabled')).toBe('true');
    expect(fakes.updateName.execute.mock.calls).toHaveLength(0);
  });
});

describe('theme (FR-SET-02)', () => {
  it('offers System, Hell and Dunkel with „System“ chosen by default and the note (AC1)', async () => {
    await ready();
    const group = screen.getByRole('radiogroup', { name: 'Design' });

    expect(within(group).getByRole('radio', { name: 'System' }).getAttribute('aria-checked')).toBe('true');
    expect(within(group).getByRole('radio', { name: 'Hell' }).getAttribute('aria-checked')).toBe('false');
    expect(within(group).getByRole('radio', { name: 'Dunkel' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('„System“ folgt der Einstellung deines Geräts.')).toBeTruthy();
  });

  it('applies the choice at once and stores it on the device (AC2)', async () => {
    await ready();

    await userEvent.click(screen.getByRole('radio', { name: 'Dunkel' }));

    expect(document.documentElement.getAttribute('data-color-scheme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dunkel' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'System' }).getAttribute('aria-checked')).toBe('false');
  });

  it('goes back to following the system with „System“ (AC3)', async () => {
    await ready();
    await userEvent.click(screen.getByRole('radio', { name: 'Hell' }));

    await userEvent.click(screen.getByRole('radio', { name: 'System' }));

    expect(document.documentElement.hasAttribute('data-color-scheme')).toBe(false);
  });

  it('starts with the choice stored on this device', async () => {
    localStorage.setItem('theme', 'light');
    await ready();

    expect(screen.getByRole('radio', { name: 'Hell' }).getAttribute('aria-checked')).toBe('true');
  });
});

describe('account (FR-SET-03)', () => {
  it('signs out through the BFF and goes to the end-session address (AC1)', async () => {
    const { logout, assign } = await ready();

    await userEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith(END_SESSION);
    });
    expect(logout.execute.mock.calls).toHaveLength(1);
  });
});

describe('delete account (FR-SET-04, ADR 0003)', () => {
  it('asks first, with the specified text and the re-authentication step instead of the password field (AC1)', async () => {
    await ready();

    await userEvent.click(screen.getByRole('button', { name: 'Konto löschen' }));

    const dialog = await screen.findByRole('dialog', { name: 'Konto löschen?' });
    expect(
      within(dialog).getByText(
        /Dein Konto wird dauerhaft gelöscht und du verlässt alle Listen\. Listen, in denen du das letzte Mitglied bist, werden ebenfalls gelöscht\./,
      ),
    ).toBeTruthy();
    expect(within(dialog).queryByLabelText('Passwort zur Bestätigung')).toBeNull();
    expect(within(dialog).getByText(/noch einmal anmelden/)).toBeTruthy();
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Abbrechen' }));
    });
  });

  it('cancelling changes nothing and returns focus to the button', async () => {
    const { assign, fakes } = await ready();
    await userEvent.click(screen.getByRole('button', { name: 'Konto löschen' }));

    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Abbrechen' }));

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(assign).not.toHaveBeenCalled();
    expect(fakes.deleteAccount.execute.mock.calls).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Konto löschen' }));
  });

  it('confirming sends the whole page to the identity provider to enter the password again', async () => {
    const { assign, fakes } = await ready();
    await userEvent.click(screen.getByRole('button', { name: 'Konto löschen' }));

    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Konto löschen' }));

    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith(REAUTH_URL);
    });
    expect(fakes.deleteAccount.execute.mock.calls).toHaveLength(0);
  });

  it('is disabled while offline (FR-FB-06 AC2)', async () => {
    const { goOffline } = await ready();

    goOffline();
    await userEvent.click(screen.getByRole('button', { name: 'Konto löschen' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  describe('back from the identity provider (…?konto-loeschen)', () => {
    async function back() {
      const context = await setup({ url: '/einstellungen?konto-loeschen' });
      const dialog = await screen.findByRole('dialog', { name: 'Konto löschen?' });
      return { ...context, dialog };
    }

    it('shows the final confirmation and removes the parameter from the address', async () => {
      const { router } = await back();

      expect(router.url).toBe('/einstellungen');
    });

    it('deletes on confirmation, then goes to the login (AC2)', async () => {
      const { dialog, fakes, assign } = await back();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Konto löschen' }));

      await vi.waitFor(() => {
        expect(assign).toHaveBeenCalledWith(LOGIN_PATH);
      });
      expect(fakes.deleteAccount.execute.mock.calls).toHaveLength(1);
    });

    it('starts the re-authentication again when the identity provider is not sure about the password', async () => {
      const { dialog, fakes, assign } = await back();
      fakes.deleteAccount.execute.mockRejectedValue(new ReauthenticationRequiredError());

      await userEvent.click(within(dialog).getByRole('button', { name: 'Konto löschen' }));

      await vi.waitFor(() => {
        expect(assign).toHaveBeenCalledWith(REAUTH_URL);
      });
    });

    it('keeps the dialog and says so when deleting fails (FR-FB-05)', async () => {
      const { dialog, fakes, assign, snackbar } = await back();
      fakes.deleteAccount.execute.mockRejectedValue(new TechnicalError('down'));

      await userEvent.click(within(dialog).getByRole('button', { name: 'Konto löschen' }));

      await vi.waitFor(() => {
        expect(snackbar.message()?.text).toBe('Das hat nicht geklappt. Bitte versuche es noch einmal.');
      });
      expect(screen.getByRole('dialog', { name: 'Konto löschen?' })).toBeTruthy();
      expect(within(dialog).getByRole('status').textContent).toContain('Das hat nicht geklappt');
      expect(assign).not.toHaveBeenCalled();
    });

    it('cancelling keeps the account and the page, and returns focus to the button', async () => {
      const { dialog, fakes, assign } = await back();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));

      await vi.waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
      expect(fakes.deleteAccount.execute.mock.calls).toHaveLength(0);
      expect(assign).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Konto löschen' }));
    });
  });
});
