import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LOGOUT, type LogoutUseCase } from '@features/session';
import { PAGE_NAVIGATION } from '@platform';
import { type SizeClass, WindowSize } from '@shared/ui/layout/window-size';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { provideTestAnnouncer } from '@testing/announcer';
import { expectNoAxeViolations } from '@testing/axe';
import { itemUseCaseFakes } from '@testing/item-use-cases';
import { listUseCaseFakes } from '@testing/list-use-cases';
import { sharingUseCaseFakes } from '@testing/sharing-use-cases';
import { provideTestTranslations } from '@testing/transloco';
import { screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AppShell } from './app-shell';
import { ListsEmptyPage } from './lists-empty-page';
import { ConnectionMonitor } from './sync/connection-monitor';

const ROUTES: Routes = [
  {
    path: '',
    component: AppShell,
    children: [{ path: '', component: ListsEmptyPage, data: { heading: 'shell.heading.lists' } }],
  },
];

const OFFLINE_TEXT = 'Keine Verbindung. Änderungen sind gerade nicht möglich.';

async function setup(size: SizeClass = 'expanded') {
  const announce = vi.fn<(message: string) => void>();
  const offline = signal(false);
  // explicit double of the monitor: the real one counts 10 seconds of failures (its own spec covers that)
  const monitor = { offline: offline.asReadonly(), reportFailure: vi.fn(), reportSuccess: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      ...listUseCaseFakes([]).providers,
      ...itemUseCaseFakes().providers,
      ...sharingUseCaseFakes().providers,
      ...provideTestAnnouncer(announce),
      provideRouter(ROUTES),
      Snackbar,
      { provide: ConnectionMonitor, useValue: monitor },
      { provide: WindowSize, useValue: { sizeClass: signal<SizeClass>(size) } },
      { provide: LOGOUT, useValue: mock<LogoutUseCase>() },
      { provide: PAGE_NAVIGATION, useValue: { assign: vi.fn() } },
      ...provideTestTranslations(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/');
  await harness.fixture.whenStable();
  await screen.findByRole('heading', { level: 2, name: 'Noch keine Listen' });
  return {
    announce,
    goOffline: async () => {
      offline.set(true);
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();
    },
    goOnline: async () => {
      offline.set(false);
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();
    },
  };
}

describe('connection banner (FR-FB-06, NFR-A11Y-07)', () => {
  it('shows nothing and says nothing while the connection is fine', async () => {
    const { announce } = await setup();

    expect(screen.queryByText(OFFLINE_TEXT)).toBeNull();
    expect(announce.mock.calls).toHaveLength(0);
  });

  it('shows the banner and says it politely once, without a second status region (AC1, NFR-A11Y-07)', async () => {
    const { goOffline, announce } = await setup();

    await goOffline();

    expect(screen.getByText(OFFLINE_TEXT)).toBeTruthy();
    expect(announce.mock.calls).toEqual([[OFFLINE_TEXT]]);
    expect(screen.getAllByRole('status')).toHaveLength(1); // the snackbar host only
  });

  it('disables what changes data and leaves reading and navigation alone (AC2)', async () => {
    const { goOffline } = await setup();

    await goOffline();

    const create = screen.getAllByRole('button', { name: 'Neue Liste' });
    expect(create.length).toBeGreaterThan(0);
    for (const button of create) expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('link', { name: 'Einstellungen' })).toBeTruthy();
  });

  it('is gone and everything works again when the connection is back (AC3)', async () => {
    const { goOffline, goOnline } = await setup();
    await goOffline();

    await goOnline();

    expect(screen.queryByText(OFFLINE_TEXT)).toBeNull();
    for (const button of screen.getAllByRole('button', { name: 'Neue Liste' })) {
      expect(button.getAttribute('aria-disabled')).not.toBe('true');
    }
  });

  it('has no axe violations with the banner', async () => {
    const { goOffline } = await setup('compact');

    await goOffline();

    await expectNoAxeViolations(document.body);
  });
});
