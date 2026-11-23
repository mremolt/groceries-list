import { inject, type Provider } from '@angular/core';

import { HttpSharing, sharingHttpProviders } from './adapter/out/http/http-sharing';
import { JoinListService } from './application/join-list-service';
import { LoadShareLinkService } from './application/load-share-link-service';
import { LookupInvitationService } from './application/lookup-invitation-service';
import { RememberInvitationService } from './application/remember-invitation-service';
import { RenewShareLinkService } from './application/renew-share-link-service';
import {
  INVITATION_PORT,
  JOIN_LIST,
  JOIN_LIST_PORT,
  LOAD_SHARE_LINK,
  LOOKUP_INVITATION,
  REMEMBER_INVITATION,
  RENEW_SHARE_LINK,
  SHARE_LINK_PORT,
} from './sharing.tokens';

/** Composition of the sharing feature (TS-ARCH-09): the adapter is bound to its ports, use cases are plain classes. */
const sharingProviders: Provider[] = [
  ...sharingHttpProviders,
  { provide: SHARE_LINK_PORT, useExisting: HttpSharing },
  { provide: INVITATION_PORT, useExisting: HttpSharing },
  { provide: JOIN_LIST_PORT, useExisting: HttpSharing },
  { provide: LOAD_SHARE_LINK, useFactory: () => new LoadShareLinkService(inject(SHARE_LINK_PORT)) },
  { provide: RENEW_SHARE_LINK, useFactory: () => new RenewShareLinkService(inject(SHARE_LINK_PORT)) },
  { provide: LOOKUP_INVITATION, useFactory: () => new LookupInvitationService(inject(INVITATION_PORT)) },
  { provide: REMEMBER_INVITATION, useFactory: () => new RememberInvitationService(inject(INVITATION_PORT)) },
  { provide: JOIN_LIST, useFactory: () => new JoinListService(inject(JOIN_LIST_PORT)) },
];

/** The published use cases of the sharing feature, for features that need them (TS-ARCH-19). */
export function provideSharingApi(): Provider[] {
  return sharingProviders;
}
