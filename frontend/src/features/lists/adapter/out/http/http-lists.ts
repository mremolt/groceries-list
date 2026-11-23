import { inject, Injectable, type Provider } from '@angular/core';
import { REPORT_ERROR, untilAborted } from '@platform';
import { TechnicalError } from '@platform/domain';
import type { ZodType } from 'zod';

import type { ShoppingList } from '../../../domain/shopping-list';
import type { CreateListPort } from '../../../ports/out/create-list-port';
import type { DeleteListPort } from '../../../ports/out/delete-list-port';
import type { LeaveListPort } from '../../../ports/out/leave-list-port';
import type { LoadListPort } from '../../../ports/out/load-list-port';
import type { LoadMyListsPort } from '../../../ports/out/load-my-lists-port';
import type { RenameListPort } from '../../../ports/out/rename-list-port';
import { ListsService } from './generated/endpoints/lists/lists.service';
import {
  CreateListResponse,
  GetListResponse,
  ListMyListsResponse,
  RenameListResponse,
} from './generated/endpoints/lists/lists.zod';
import { toListError, toShoppingList } from './list-mapper';

/**
 * Outgoing HTTP adapter of the lists feature. The generated client does the calls, the generated zod schemas parse every
 * answer before it is mapped (TS-API-05); DTOs never leave this folder (TS-ARCH-05). One call per port method: the drawer
 * gets all counts from the single `listMyLists` answer (API-N1-01).
 */
@Injectable()
export class HttpLists
  implements LoadMyListsPort, LoadListPort, CreateListPort, RenameListPort, DeleteListPort, LeaveListPort
{
  private readonly api = inject(ListsService);
  private readonly reportError = inject(REPORT_ERROR);

  async loadMyLists(signal?: AbortSignal): Promise<readonly ShoppingList[]> {
    const dto = await this.call(() => this.api.listMyLists(), signal);
    return this.parse(ListMyListsResponse, dto).lists.map(toShoppingList);
  }

  async loadList(id: string, signal?: AbortSignal): Promise<ShoppingList> {
    return toShoppingList(this.parse(GetListResponse, await this.call(() => this.api.getList(id), signal)));
  }

  async createList(name: string): Promise<ShoppingList> {
    return toShoppingList(this.parse(CreateListResponse, await this.call(() => this.api.createList({ name }))));
  }

  async renameList(id: string, name: string): Promise<ShoppingList> {
    return toShoppingList(this.parse(RenameListResponse, await this.call(() => this.api.renameList(id, { name }))));
  }

  async deleteList(id: string): Promise<void> {
    await this.call(() => this.api.deleteList(id));
  }

  async leaveList(id: string): Promise<void> {
    await this.call(() => this.api.leaveList(id));
  }

  private async call(request: () => Parameters<typeof untilAborted>[0], signal?: AbortSignal): Promise<unknown> {
    try {
      return await untilAborted(request(), signal);
    } catch (error) {
      throw this.reported(toListError(error));
    }
  }

  private parse<T>(schema: ZodType<T>, dto: unknown): T {
    const parsed = schema.safeParse(dto);
    if (!parsed.success) {
      throw this.reported(new TechnicalError('lists API answered a malformed body', { cause: parsed.error }));
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
export const listsHttpProviders: Provider[] = [ListsService, HttpLists];
