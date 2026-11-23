import type { Provider } from '@angular/core';
import { CHECK_SIGNED_IN, type CheckSignedInUseCase } from '@features/session';
import {
  JOIN_LIST,
  type JoinedList,
  type JoinListUseCase,
  LOAD_SHARE_LINK,
  type LoadShareLinkUseCase,
  LOOKUP_INVITATION,
  type LookupInvitationUseCase,
  REMEMBER_INVITATION,
  type RememberInvitationUseCase,
  RENEW_SHARE_LINK,
  type RenewShareLinkUseCase,
} from '@features/sharing';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { ShareActions } from '../features/shell/adapter/in/ui/share-actions';

export const LINK_CODE = 'Kq3-vZ_0aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX';
export const LINK = { url: `https://einkauf.example.test/j/${LINK_CODE}` };
export const JOINED: JoinedList = { listId: 'l1', listName: 'Wocheneinkauf', alreadyMember: false };

/** Use-case doubles of the session probe and the sharing feature, with the providers that wire the UI to them (TS-TEST-01). */
export interface SharingUseCaseFakes {
  readonly checkSignedIn: MockProxy<CheckSignedInUseCase>;
  readonly loadShareLink: MockProxy<LoadShareLinkUseCase>;
  readonly renewShareLink: MockProxy<RenewShareLinkUseCase>;
  readonly lookupInvitation: MockProxy<LookupInvitationUseCase>;
  readonly rememberInvitation: MockProxy<RememberInvitationUseCase>;
  readonly joinList: MockProxy<JoinListUseCase>;
}

export function sharingUseCaseFakes(): { fakes: SharingUseCaseFakes; providers: Provider[] } {
  const fakes: SharingUseCaseFakes = {
    checkSignedIn: mock<CheckSignedInUseCase>(),
    loadShareLink: mock<LoadShareLinkUseCase>(),
    renewShareLink: mock<RenewShareLinkUseCase>(),
    lookupInvitation: mock<LookupInvitationUseCase>(),
    rememberInvitation: mock<RememberInvitationUseCase>(),
    joinList: mock<JoinListUseCase>(),
  };
  fakes.checkSignedIn.execute.mockResolvedValue(true);
  fakes.loadShareLink.execute.mockResolvedValue(LINK);
  fakes.joinList.execute.mockResolvedValue(JOINED);
  const providers: Provider[] = [
    ShareActions,
    { provide: CHECK_SIGNED_IN, useValue: fakes.checkSignedIn },
    { provide: LOAD_SHARE_LINK, useValue: fakes.loadShareLink },
    { provide: RENEW_SHARE_LINK, useValue: fakes.renewShareLink },
    { provide: LOOKUP_INVITATION, useValue: fakes.lookupInvitation },
    { provide: REMEMBER_INVITATION, useValue: fakes.rememberInvitation },
    { provide: JOIN_LIST, useValue: fakes.joinList },
  ];
  return { fakes, providers };
}
