import { TestBed } from '@angular/core/testing';
import { JoinLimitReachedError, ShareLinkInvalidError } from '@features/sharing';
import { TechnicalError } from '@platform/domain';
import { JOINED, LINK_CODE, sharingUseCaseFakes } from '@testing/sharing-use-cases';
import { describe, expect, it } from 'vitest';

import { JoinStore } from './join-store';

function setup() {
  const { fakes, providers } = sharingUseCaseFakes();
  TestBed.configureTestingModule({ providers: [JoinStore, ...providers] });
  return { store: TestBed.inject(JoinStore), fakes };
}

describe('JoinStore with a session', () => {
  it('joins at once with the token of the link (FR-SHARE-03 AC1)', async () => {
    const { store, fakes } = setup();

    await store.start(LINK_CODE);

    expect(fakes.joinList.execute.mock.calls).toEqual([[LINK_CODE]]);
    expect(fakes.lookupInvitation.execute.mock.calls).toHaveLength(0); // no extra call for a signed-in person
    expect(store.phase()).toBe('joined');
    expect(store.joined()).toEqual(JOINED);
    expect(store.signedIn()).toBe(true);
  });

  it('keeps alreadyMember for the page, which then opens the list without a message (FR-SHARE-03 AC2)', async () => {
    const { store, fakes } = setup();
    fakes.joinList.execute.mockResolvedValue({ ...JOINED, alreadyMember: true });

    await store.start(LINK_CODE);

    expect(store.joined()?.alreadyMember).toBe(true);
  });

  it('joins without a token on the way back from the login (FR-AUTH-06 AC3)', async () => {
    const { store, fakes } = setup();

    await store.start(undefined);

    expect(fakes.checkSignedIn.execute.mock.calls).toHaveLength(0);
    expect(fakes.joinList.execute.mock.calls).toEqual([[undefined]]);
    expect(store.phase()).toBe('joined');
  });

  it.each([
    ['a renewed link', new ShareLinkInvalidError(), 'invalid'],
    ['a full list (BR-12)', new JoinLimitReachedError('members'), 'memberLimit'],
    ['100 lists already (BR-12)', new JoinLimitReachedError('lists'), 'listLimit'],
    ['a server failure', new TechnicalError('boom'), 'failed'],
  ] as const)('shows the matching page for %s', async (_name, error, phase) => {
    const { store, fakes } = setup();
    fakes.joinList.execute.mockRejectedValue(error);

    await store.start(LINK_CODE);

    expect(store.phase()).toBe(phase);
    expect(store.signedIn()).toBe(true);
  });

  it('rethrows what it does not expect instead of hiding a bug (TS-ARCH-23)', async () => {
    const { store, fakes } = setup();
    fakes.joinList.execute.mockRejectedValue(new TypeError('bug'));

    await expect(store.start(LINK_CODE)).rejects.toBeInstanceOf(TypeError);
  });

  it('can retry after a failure', async () => {
    const { store, fakes } = setup();
    fakes.joinList.execute.mockRejectedValueOnce(new TechnicalError('boom'));

    await store.start(LINK_CODE);
    await store.start(LINK_CODE);

    expect(store.phase()).toBe('joined');
  });
});

describe('JoinStore without a session', () => {
  it('shows the invitation with the list name only and joins nothing (FR-AUTH-06 AC1/AC4)', async () => {
    const { store, fakes } = setup();
    fakes.checkSignedIn.execute.mockResolvedValue(false);
    fakes.lookupInvitation.execute.mockResolvedValue({ listName: 'Grillabend Samstag' });

    await store.start(LINK_CODE);

    expect(store.phase()).toBe('invitation');
    expect(store.listName()).toBe('Grillabend Samstag');
    expect(store.signedIn()).toBe(false);
    expect(fakes.joinList.execute.mock.calls).toHaveLength(0);
  });

  it('shows the invalid-link page for an unknown or renewed token, with the visitor flag (FR-SHARE-04 AC1)', async () => {
    const { store, fakes } = setup();
    fakes.checkSignedIn.execute.mockResolvedValue(false);
    fakes.lookupInvitation.execute.mockRejectedValue(new ShareLinkInvalidError());

    await store.start(LINK_CODE);

    expect(store.phase()).toBe('invalid');
    expect(store.signedIn()).toBe(false);
  });

  it('hands the token to the server session and allows the page to leave (ADR 0008)', async () => {
    const { store, fakes } = setup();
    fakes.checkSignedIn.execute.mockResolvedValue(false);
    fakes.lookupInvitation.execute.mockResolvedValue({ listName: 'Grillabend Samstag' });
    await store.start(LINK_CODE);

    expect(await store.remember()).toBe(true);

    expect(fakes.rememberInvitation.execute.mock.calls).toEqual([[LINK_CODE]]);
  });

  it('shows the invalid-link page when the server refuses the token to remember', async () => {
    const { store, fakes } = setup();
    fakes.checkSignedIn.execute.mockResolvedValue(false);
    fakes.lookupInvitation.execute.mockResolvedValue({ listName: 'Grillabend Samstag' });
    fakes.rememberInvitation.execute.mockRejectedValue(new ShareLinkInvalidError());
    await store.start(LINK_CODE);

    expect(await store.remember()).toBe(false);

    expect(store.phase()).toBe('invalid');
  });

  it('fails when the session probe fails, instead of guessing', async () => {
    const { store, fakes } = setup();
    fakes.checkSignedIn.execute.mockRejectedValue(new TechnicalError('boom'));

    await store.start(LINK_CODE);

    expect(store.phase()).toBe('failed');
  });
});
