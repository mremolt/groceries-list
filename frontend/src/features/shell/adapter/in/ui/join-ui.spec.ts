import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { JoinLimitReachedError, ShareLinkInvalidError } from '@features/sharing';
import { LOGIN_PATH, PAGE_NAVIGATION, type PageNavigation } from '@platform';
import { TechnicalError } from '@platform/domain';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { expectNoAxeViolations } from '@testing/axe';
import { deferred } from '@testing/deferred';
import { JOINED, LINK_CODE, sharingUseCaseFakes } from '@testing/sharing-use-cases';
import { provideTestTranslations } from '@testing/transloco';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { JoinPage } from './join-page';
import { JoinStore } from './join-store';

// The join routes of shell.routes.ts with the real page and store; only the use cases are doubles (NG-TEST-06).
const ROUTES: Routes = [
  { path: 'j/consume', component: JoinPage },
  { path: 'j/:token', component: JoinPage },
  { path: 'listen/:id', children: [] },
  { path: '', children: [] },
];

async function setup(url = `/j/${LINK_CODE}`) {
  const { fakes, providers } = sharingUseCaseFakes();
  const assign = vi.fn<(address: string) => void>(); // explicit fake (NG-TOOL-11)
  const navigation: PageNavigation = { assign };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(ROUTES, withComponentInputBinding()),
      JoinStore,
      Snackbar,
      ...providers,
      { provide: PAGE_NAVIGATION, useValue: navigation },
      ...provideTestTranslations(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  const settled = harness.navigateByUrl(url);
  return {
    harness,
    fakes,
    assign,
    router: TestBed.inject(Router),
    location: TestBed.inject(Location),
    snackbar: TestBed.inject(Snackbar),
    settled,
  };
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  await harness.fixture.whenStable();
  harness.detectChanges();
}

describe('join page with a session (FR-SHARE-03)', () => {
  it('joins, opens the list with the token gone from the address and says so (AC1)', async () => {
    const { harness, fakes, router, snackbar, settled } = await setup();
    await settled;
    await settle(harness);

    expect(fakes.joinList.execute.mock.calls).toEqual([[LINK_CODE]]);
    await vi.waitFor(() => {
      expect(router.url).toBe('/listen/l1');
    });
    await vi.waitFor(() => {
      expect(snackbar.message()?.text).toBe('Du bist der Liste „Wocheneinkauf“ beigetreten.');
    });
    expect(router.url).not.toContain(LINK_CODE);
  });

  it('opens the list without a message when the person is already a member (AC2)', async () => {
    const { harness, fakes, router, snackbar, settled } = await setup();
    fakes.joinList.execute.mockResolvedValue({ ...JOINED, alreadyMember: true });
    await settled;
    await settle(harness);

    await vi.waitFor(() => {
      expect(router.url).toBe('/listen/l1');
    });
    expect(snackbar.message()).toBeNull();
  });

  it('joins with the remembered token on /j/consume, without a token in the request (FR-AUTH-06 AC3)', async () => {
    const { harness, fakes, router, settled } = await setup('/j/consume');
    await settled;
    await settle(harness);

    expect(fakes.joinList.execute.mock.calls).toEqual([[undefined]]);
    await vi.waitFor(() => {
      expect(router.url).toBe('/listen/l1');
    });
  });

  it('shows a loading status while the join runs', async () => {
    const { harness, fakes, settled } = await setup();
    const pending = deferred<typeof JOINED>();
    fakes.joinList.execute.mockReturnValue(pending.promise);
    await settled;
    harness.detectChanges();

    expect(await screen.findByRole('progressbar', { name: 'Du trittst der Liste bei' })).toBeTruthy();
    pending.resolve(JOINED);
  });

  it('refuses with the member-limit text (AC4) and takes the token off the address bar', async () => {
    const { harness, fakes, location, settled } = await setup();
    fakes.joinList.execute.mockRejectedValue(new JoinLimitReachedError('members'));
    await settled;
    await settle(harness);

    expect(await screen.findByText('Diese Liste hat die maximale Anzahl an Mitgliedern erreicht.')).toBeTruthy();
    expect(location.path()).toBe('');
    await expectNoAxeViolations(harness.routeNativeElement!);
  });

  it('offers „Zu meinen Listen“ on the invalid-link page of a signed-in person, revealing nothing (FR-SHARE-04)', async () => {
    const { harness, fakes, settled } = await setup();
    fakes.joinList.execute.mockRejectedValue(new ShareLinkInvalidError());
    await settled;
    await settle(harness);

    expect(await screen.findByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' })).toBeTruthy();
    expect(screen.getByText('Bitte die Person, die dir den Link geschickt hat, um einen neuen.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Zu meinen Listen' }).getAttribute('href')).toBe('/');
    expect(screen.queryByText(/Wocheneinkauf/)).toBeNull();
    await expectNoAxeViolations(harness.routeNativeElement!);
  });

  it('keeps the address, offers a retry after a server failure and joins on the second try', async () => {
    const { harness, fakes, location, settled } = await setup();
    fakes.joinList.execute.mockRejectedValueOnce(new TechnicalError('boom'));
    await settled;
    await settle(harness);

    const retry = await screen.findByRole('button', { name: 'Erneut versuchen' });
    expect(location.path()).toContain('/j/'); // a reload would try again
    await userEvent.click(retry);
    await settle(harness);

    expect(fakes.joinList.execute.mock.calls).toHaveLength(2);
  });
});

describe('join page without a session (FR-AUTH-06, FR-SHARE-04)', () => {
  async function visitor() {
    const context = await setup();
    context.fakes.checkSignedIn.execute.mockResolvedValue(false);
    context.fakes.lookupInvitation.execute.mockResolvedValue({ listName: 'Grillabend Samstag' });
    await context.settled;
    await settle(context.harness);
    return context;
  }

  it('shows the invitation banner with the list name only and no other content (AC1, AC4)', async () => {
    const { harness } = await visitor();

    expect(
      await screen.findByText(
        'Du wurdest zur Liste „Grillabend Samstag“ eingeladen. Erstelle ein Konto oder melde dich an, um beizutreten.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Liste beitreten' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Konto erstellen und beitreten' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Anmelden' })).toBeTruthy();
    await expectNoAxeViolations(harness.routeNativeElement!);
  });

  it('remembers the token on the server, then starts the sign-up at the identity provider (AC2, ADR 0008)', async () => {
    const { fakes, assign } = await visitor();

    await userEvent.click(await screen.findByRole('button', { name: 'Konto erstellen und beitreten' }));

    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith(`${LOGIN_PATH}?prompt=create`);
    });
    expect(fakes.rememberInvitation.execute.mock.calls).toEqual([[LINK_CODE]]);
  });

  it('remembers the token and starts the plain login with „Anmelden“', async () => {
    const { fakes, assign } = await visitor();

    await userEvent.click(await screen.findByRole('button', { name: 'Anmelden' }));

    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith(LOGIN_PATH);
    });
    expect(fakes.rememberInvitation.execute.mock.calls).toEqual([[LINK_CODE]]);
  });

  it('does not leave when the server refuses the token to remember', async () => {
    const { fakes, assign } = await visitor();
    fakes.rememberInvitation.execute.mockRejectedValue(new ShareLinkInvalidError());

    await userEvent.click(await screen.findByRole('button', { name: 'Konto erstellen und beitreten' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' })).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });

  it('shows the invalid-link page with „Anmelden“ for an unknown or renewed link (FR-SHARE-04 AC1)', async () => {
    const { harness, fakes, assign, location, settled } = await setup();
    fakes.checkSignedIn.execute.mockResolvedValue(false);
    fakes.lookupInvitation.execute.mockRejectedValue(new ShareLinkInvalidError());
    await settled;
    await settle(harness);

    expect(await screen.findByRole('heading', { level: 2, name: 'Dieser Link funktioniert nicht mehr' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Zu meinen Listen' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(assign).toHaveBeenCalledWith(LOGIN_PATH);
    expect(fakes.rememberInvitation.execute.mock.calls).toHaveLength(0);
    expect(location.path()).toBe('');
  });
});
