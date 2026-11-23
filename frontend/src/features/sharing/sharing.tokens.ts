import { InjectionToken } from '@angular/core';

import type { JoinListUseCase } from './ports/in/join-list-use-case';
import type { LoadShareLinkUseCase } from './ports/in/load-share-link-use-case';
import type { LookupInvitationUseCase } from './ports/in/lookup-invitation-use-case';
import type { RememberInvitationUseCase } from './ports/in/remember-invitation-use-case';
import type { RenewShareLinkUseCase } from './ports/in/renew-share-link-use-case';
import type { InvitationPort } from './ports/out/invitation-port';
import type { JoinListPort } from './ports/out/join-list-port';
import type { ShareLinkPort } from './ports/out/share-link-port';

export const SHARE_LINK_PORT = new InjectionToken<ShareLinkPort>('ShareLinkPort');
export const INVITATION_PORT = new InjectionToken<InvitationPort>('InvitationPort');
export const JOIN_LIST_PORT = new InjectionToken<JoinListPort>('JoinListPort');

export const LOAD_SHARE_LINK = new InjectionToken<LoadShareLinkUseCase>('LoadShareLink');
export const RENEW_SHARE_LINK = new InjectionToken<RenewShareLinkUseCase>('RenewShareLink');
export const LOOKUP_INVITATION = new InjectionToken<LookupInvitationUseCase>('LookupInvitation');
export const REMEMBER_INVITATION = new InjectionToken<RememberInvitationUseCase>('RememberInvitation');
export const JOIN_LIST = new InjectionToken<JoinListUseCase>('JoinList');
