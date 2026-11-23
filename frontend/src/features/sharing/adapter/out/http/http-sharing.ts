import { inject, Injectable, type Provider } from '@angular/core';
import { REPORT_ERROR, untilAborted } from '@platform';
import { TechnicalError } from '@platform/domain';
import type { ZodType } from 'zod';

import type { Invitation, JoinedList, ShareLink } from '../../../domain/share-link';
import type { InvitationPort } from '../../../ports/out/invitation-port';
import type { JoinListPort } from '../../../ports/out/join-list-port';
import type { ShareLinkPort } from '../../../ports/out/share-link-port';
import { SharingService } from './generated/endpoints/sharing/sharing.service';
import {
  GetShareLinkResponse,
  JoinListResponse,
  LookupInvitationResponse,
  RenewShareLinkResponse,
} from './generated/endpoints/sharing/sharing.zod';
import { toSharingError } from './sharing-mapper';

/**
 * Outgoing HTTP adapter of the sharing feature. The generated client does the calls, the generated zod schemas parse
 * every answer before it is mapped (TS-API-05); DTOs never leave this folder (TS-ARCH-05). The share token only ever
 * travels in a request body (ADR 0008).
 */
@Injectable()
export class HttpSharing implements ShareLinkPort, InvitationPort, JoinListPort {
  private readonly api = inject(SharingService);
  private readonly reportError = inject(REPORT_ERROR);

  async loadShareLink(listId: string, signal?: AbortSignal): Promise<ShareLink> {
    const dto = await this.call('shareLink', () => this.api.getShareLink(listId), signal);
    return { url: this.parse(GetShareLinkResponse, dto).url };
  }

  async renewShareLink(listId: string): Promise<ShareLink> {
    const dto = await this.call('shareLink', () => this.api.renewShareLink(listId));
    return { url: this.parse(RenewShareLinkResponse, dto).url };
  }

  async lookupInvitation(token: string, signal?: AbortSignal): Promise<Invitation> {
    const dto = await this.call('invitation', () => this.api.lookupInvitation({ token }), signal);
    return { listName: this.parse(LookupInvitationResponse, dto).listName };
  }

  async rememberInvitation(token: string): Promise<void> {
    await this.call('invitation', () => this.api.rememberInvitation({ token }));
  }

  async joinList(token?: string): Promise<JoinedList> {
    const dto = await this.call('join', () => this.api.joinList(token === undefined ? undefined : { token }));
    const { listId, listName, alreadyMember } = this.parse(JoinListResponse, dto);
    return { listId, listName, alreadyMember };
  }

  private async call(
    operation: Parameters<typeof toSharingError>[1],
    request: () => Parameters<typeof untilAborted>[0],
    signal?: AbortSignal,
  ): Promise<unknown> {
    try {
      return await untilAborted(request(), signal);
    } catch (error) {
      throw this.reported(toSharingError(error, operation));
    }
  }

  private parse<T>(schema: ZodType<T>, dto: unknown): T {
    const parsed = schema.safeParse(dto);
    if (!parsed.success) {
      throw this.reported(new TechnicalError('sharing API answered a malformed body', { cause: parsed.error }));
    }
    return parsed.data;
  }

  /** Reports a created `TechnicalError` once; no HTTP interceptor reports failed calls yet (NG-OBS-04 is open). */
  private reported(error: Error): Error {
    if (error instanceof TechnicalError) this.reportError.report(error);
    return error;
  }
}

/** The adapter and the generated service it wraps, which is not auto-provided (TS-API-04); generated code stays here. */
export const sharingHttpProviders: Provider[] = [SharingService, HttpSharing];
