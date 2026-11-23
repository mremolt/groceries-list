import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LOGOUT, type LogoutUseCase } from '@features/session';
import { PAGE_NAVIGATION, type PageNavigation } from '@platform';
import { TechnicalError } from '@platform/domain';
import { type SizeClass, WindowSize } from '@shared/ui/layout/window-size';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { provideTestAnnouncer } from '@testing/announcer';
import { expectNoAxeViolations } from '@testing/axe';
import { itemUseCaseFakes } from '@testing/item-use-cases';
import { listUseCaseFakes } from '@testing/list-use-cases';
import { sharingUseCaseFakes } from '@testing/sharing-use-cases';
import { provideTestTranslations } from '@testing/transloco';
import { fireEvent, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AppShell } from './app-shell';
import { ListsEmptyPage } from './lists-empty-page';
import { SettingsPage } from './settings-page';

const ROUTES: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      { path: '', component: ListsEmptyPage, data: { heading: 'shell.heading.lists' } },
      { path: 'einstellungen', component: SettingsPage, data: { heading: 'shell.heading.settings' } },
    ],
  },
];

async function setup(size: SizeClass = 'compact', url = '/') {
  const sizeClass = signal<SizeClass>(size);
  const logout = mock<LogoutUseCase>();
  // NG-TOOL-11: explicit fake, `expect(mock.method)` trips unbound-method
  const assign = vi.fn<(url: string) => void>();
  const navigation: PageNavigation = { assign };
  const { providers: listProviders } = listUseCaseFakes();
  TestBed.configureTestingModule({
    providers: [
      ...listProviders,
      ...itemUseCaseFakes().providers, // the shell's sync reads the open list's count from the items store
      ...provideTestAnnouncer(),
      ...sharingUseCaseFakes().providers,
      provideRouter(ROUTES),
      Snackbar,
      { provide: WindowSize, useValue: { sizeClass } },
      { provide: LOGOUT, useValue: logout },
      { provide: PAGE_NAVIGATION, useValue: navigation },
      ...provideTestTranslations(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await harness.fixture.whenStable();
  return {
    container: document.body,
    fixture: harness.fixture,
    sizeClass,
    logout,
    assign,
    snackbar: TestBed.inject(Snackbar),
  };
}

/** CDK overlays and the menu key manager read the legacy `keyCode`, which user-event does not set. */
async function pressKey(key: string, keyCode: number): Promise<void> {
  fireEvent.keyDown(document.activeElement ?? document.body, { key, keyCode });
  await new Promise<void>((resolve) => setTimeout(resolve)); // overlays and the key manager focus after a render
}

describe('AppShell', () => {
  describe('page structure', () => {
    it('shows the page title as the one main heading in the app bar, without a theme switch', async () => {
      await setup();

      expect(await screen.findByRole('heading', { level: 1, name: 'Einkaufsliste' })).toBeTruthy();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.queryByRole('button', { name: /dunkel|hell|theme/i })).toBeNull();
    });

    it('shows „Einstellungen“ as the heading of the settings page', async () => {
      await setup('compact', '/einstellungen');

      expect(await screen.findByRole('heading', { level: 1, name: 'Einstellungen' })).toBeTruthy();
    });

    it('shows the empty state of FR-FB-01 AC1 with an active „Neue Liste“ button', async () => {
      await setup();

      const main = within(await screen.findByRole('main'));
      expect(main.getByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeTruthy();
      expect(
        main.getByText('Lege deine erste Einkaufsliste an und teile sie mit Familie, Partner oder WG.'),
      ).toBeTruthy();
      expect(
        main.getByText('Du hast einen Teilen-Link bekommen? Öffne ihn einfach – die Liste erscheint dann hier.'),
      ).toBeTruthy();
      expect(main.getByRole('button', { name: 'Neue Liste' }).getAttribute('aria-disabled')).not.toBe('true');
    });
  });

  describe('modal drawer on compact and medium', () => {
    it.each(['compact', 'medium'] as const)(
      'opens from „Navigation öffnen“ on %s with the FR-NAV-02 contents',
      async (size) => {
        await setup(size);

        await userEvent.click(await screen.findByRole('button', { name: 'Navigation öffnen' }));

        const nav = await screen.findByRole('navigation', { name: 'Hauptnavigation' });
        expect(within(nav).getByRole('heading', { name: 'Meine Listen' })).toBeTruthy();
        expect(within(nav).getByText('Noch keine Listen.')).toBeTruthy();
        expect(within(nav).getByRole('link', { name: 'Einstellungen' })).toBeTruthy();
        expect(screen.getAllByRole('button', { name: 'Neue Liste' }).length).toBeGreaterThan(0);
      },
    );

    it('closes with „Navigation schließen“ and returns focus to the menu button', async () => {
      await setup();
      const menuButton = await screen.findByRole('button', { name: 'Navigation öffnen' });
      await userEvent.click(menuButton);

      await userEvent.click(await screen.findByRole('button', { name: 'Navigation schließen' }));

      await expect.poll(() => document.activeElement).toBe(menuButton);
    });

    it('closes with Esc and returns focus to the menu button', async () => {
      await setup();
      const menuButton = await screen.findByRole('button', { name: 'Navigation öffnen' });
      await userEvent.click(menuButton);
      await screen.findByRole('navigation', { name: 'Hauptnavigation' });

      await pressKey('Escape', 27);

      await expect.poll(() => document.activeElement).toBe(menuButton);
    });

    it('closes when an entry is selected and shows that page', async () => {
      await setup();
      await userEvent.click(await screen.findByRole('button', { name: 'Navigation öffnen' }));

      await userEvent.click(await screen.findByRole('link', { name: 'Einstellungen' }));

      expect(await screen.findByRole('heading', { level: 1, name: 'Einstellungen' })).toBeTruthy();
      await expect.poll(() => screen.queryByRole('button', { name: 'Navigation schließen' })).toBeNull();
    });
  });

  describe('permanent drawer on expanded', () => {
    it('shows the navigation at once, without menu or close button', async () => {
      await setup('expanded');

      expect(await screen.findByRole('navigation', { name: 'Hauptnavigation' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Navigation öffnen' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Navigation schließen' })).toBeNull();
    });

    it('marks the current page for assistive technology and highlights it', async () => {
      await setup('expanded', '/einstellungen');

      const link = await screen.findByRole('link', { name: 'Einstellungen' });
      await expect.poll(() => link.getAttribute('aria-current')).toBe('page');
      expect(link.classList.contains('active')).toBe(true);
    });

    it('keeps the page and switches the drawer to modal when the window shrinks (FR-NAV-01 AC1)', async () => {
      const { sizeClass, fixture } = await setup('expanded', '/einstellungen');

      sizeClass.set('compact');
      await fixture.whenStable();

      expect(await screen.findByRole('heading', { level: 1, name: 'Einstellungen' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Navigation öffnen' })).toBeTruthy();
    });
  });

  describe('„Weitere Optionen“ menu', () => {
    it('reports its open state and offers „Einstellungen“ and „Abmelden“', async () => {
      await setup();
      const button = await screen.findByRole('button', { name: 'Weitere Optionen' });
      expect(button.getAttribute('aria-expanded')).toBe('false');

      await userEvent.click(button);

      expect(button.getAttribute('aria-expanded')).toBe('true');
      const menu = await screen.findByRole('menu');
      expect(
        within(menu)
          .getAllByRole('menuitem')
          .map((item) => item.textContent.trim()),
      ).toEqual(['Einstellungen', 'Abmelden']);
    });

    it('moves between entries with the arrow keys and closes with Esc, returning focus to the button', async () => {
      await setup();
      const button = await screen.findByRole('button', { name: 'Weitere Optionen' });
      button.focus();
      await userEvent.keyboard('{Enter}'); // keyboard origin: the first entry gets focus
      await screen.findByRole('menu');
      await expect.poll(() => document.activeElement?.textContent.trim()).toBe('Einstellungen');

      await pressKey('ArrowDown', 40);
      expect(document.activeElement?.textContent.trim()).toBe('Abmelden');
      await pressKey('Escape', 27);

      await expect.poll(() => document.activeElement).toBe(button);
    });

    it('signs out and sends the whole page to the IdP end-session address', async () => {
      const { logout, assign } = await setup();
      logout.execute.mockResolvedValue(
        'http://keycloak.localhost:8180/realms/groceries/protocol/openid-connect/logout',
      );
      await userEvent.click(await screen.findByRole('button', { name: 'Weitere Optionen' }));

      await userEvent.click(await screen.findByRole('menuitem', { name: 'Abmelden' }));

      await expect
        .poll(() => assign)
        .toHaveBeenCalledWith('http://keycloak.localhost:8180/realms/groceries/protocol/openid-connect/logout');
    });

    it('shows the generic error snackbar when signing out fails and stays on the page', async () => {
      const { logout, assign } = await setup();
      logout.execute.mockRejectedValue(new TechnicalError('server error'));
      await userEvent.click(await screen.findByRole('button', { name: 'Weitere Optionen' }));

      await userEvent.click(await screen.findByRole('menuitem', { name: 'Abmelden' }));

      expect(await screen.findByText('Das hat nicht geklappt. Bitte versuche es noch einmal.')).toBeTruthy();
      expect(assign).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it.each([
      ['compact, drawer closed', 'compact'],
      ['expanded, permanent drawer', 'expanded'],
    ] as const)('has no violations (%s)', async (_label, size) => {
      const { container } = await setup(size);
      await screen.findByRole('main');

      await expectNoAxeViolations(container);
    });

    it('has no violations with the modal drawer open', async () => {
      const { container } = await setup();
      await userEvent.click(await screen.findByRole('button', { name: 'Navigation öffnen' }));
      await screen.findByRole('navigation', { name: 'Hauptnavigation' });

      await expectNoAxeViolations(container);
    });

    it('has no violations with the menu open', async () => {
      await setup();
      await userEvent.click(await screen.findByRole('button', { name: 'Weitere Optionen' }));

      await expectNoAxeViolations(await screen.findByRole('menu'));
    });

    it('has no violations with a snackbar', async () => {
      const { container, snackbar, fixture } = await setup();
      snackbar.show('Gespeichert');
      await fixture.whenStable();

      await expectNoAxeViolations(container);
    });
  });
});
