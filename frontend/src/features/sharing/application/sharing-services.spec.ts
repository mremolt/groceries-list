import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ShareLinkInvalidError } from '../domain/sharing-errors';
import type { InvitationPort } from '../ports/out/invitation-port';
import type { JoinListPort } from '../ports/out/join-list-port';
import type { ShareLinkPort } from '../ports/out/share-link-port';
import { JoinListService } from './join-list-service';
import { LoadShareLinkService } from './load-share-link-service';
import { LookupInvitationService } from './lookup-invitation-service';
import { RememberInvitationService } from './remember-invitation-service';
import { RenewShareLinkService } from './renew-share-link-service';

const LINK_CODE = 'Kq3-vZ_0aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX';
const LIST_ID = '8f0f5b1e-0000-4000-8000-0000000000a1';

describe('share link services', () => {
  it('loads the link of a list', async () => {
    const port = mock<ShareLinkPort>();
    const signal = new AbortController().signal;
    port.loadShareLink.calledWith(LIST_ID, signal).mockResolvedValue({ url: `https://x.test/j/${LINK_CODE}` });

    expect(await new LoadShareLinkService(port).execute(LIST_ID, signal)).toEqual({
      url: `https://x.test/j/${LINK_CODE}`,
    });
  });

  it('renews the link of a list', async () => {
    const port = mock<ShareLinkPort>();
    port.renewShareLink.calledWith(LIST_ID).mockResolvedValue({ url: 'https://x.test/j/new' });

    expect(await new RenewShareLinkService(port).execute(LIST_ID)).toEqual({ url: 'https://x.test/j/new' });
  });
});

describe('invitation services', () => {
  it('looks the list name up for a trimmed token', async () => {
    const port = mock<InvitationPort>();
    port.lookupInvitation.calledWith(LINK_CODE, undefined).mockResolvedValue({ listName: 'Wocheneinkauf' });

    expect(await new LookupInvitationService(port).execute(` ${LINK_CODE} `)).toEqual({ listName: 'Wocheneinkauf' });
  });

  it('refuses a malformed token without asking the server', async () => {
    const port = mock<InvitationPort>();

    await expect(new LookupInvitationService(port).execute('no/token')).rejects.toBeInstanceOf(ShareLinkInvalidError);
    expect(port.lookupInvitation.mock.calls).toHaveLength(0);
  });

  it('remembers a valid token and refuses a malformed one', async () => {
    const port = mock<InvitationPort>();
    port.rememberInvitation.mockResolvedValue();
    const service = new RememberInvitationService(port);

    await service.execute(LINK_CODE);
    await expect(service.execute('')).rejects.toBeInstanceOf(ShareLinkInvalidError);

    expect(port.rememberInvitation.mock.calls).toEqual([[LINK_CODE]]);
  });
});

describe('JoinListService', () => {
  const JOINED = { listId: LIST_ID, listName: 'Wocheneinkauf', alreadyMember: false };

  it('joins with the token of the link', async () => {
    const port = mock<JoinListPort>();
    port.joinList.calledWith(LINK_CODE).mockResolvedValue(JOINED);

    expect(await new JoinListService(port).execute(LINK_CODE)).toEqual(JOINED);
  });

  it('joins with the remembered token when none is given (FR-AUTH-06 AC3)', async () => {
    const port = mock<JoinListPort>();
    port.joinList.calledWith(undefined).mockResolvedValue(JOINED);

    expect(await new JoinListService(port).execute()).toEqual(JOINED);
  });

  it('refuses a malformed token without asking the server', async () => {
    const port = mock<JoinListPort>();

    await expect(new JoinListService(port).execute('a b')).rejects.toBeInstanceOf(ShareLinkInvalidError);
    expect(port.joinList.mock.calls).toHaveLength(0);
  });
});
