import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, type Provider } from '@angular/core';
import { REPORT_ERROR, untilAborted } from '@platform';
import { TechnicalError } from '@platform/domain';
import type { ZodType } from 'zod';

import type { Item } from '../../../domain/item';
import type { ItemsLoad, LoadItemsOptions } from '../../../domain/items-load';
import type { AddItemPort } from '../../../ports/out/add-item-port';
import type { ClearCheckedItemsPort } from '../../../ports/out/clear-checked-items-port';
import type { DeleteItemPort } from '../../../ports/out/delete-item-port';
import type { LoadItemsPort } from '../../../ports/out/load-items-port';
import type { ItemChange, UpdateItemPort } from '../../../ports/out/update-item-port';
import { ItemsService } from './generated/endpoints/items/items.service';
import {
  AddItemResponse,
  ClearCheckedItemsResponse,
  ListItemsResponse,
  UpdateItemResponse,
} from './generated/endpoints/items/items.zod';
import { toItem, toItemError } from './item-mapper';

/**
 * Outgoing HTTP adapter of the items feature. The generated client does the calls, the generated zod schemas parse every
 * answer before it is mapped (TS-API-05); DTOs never leave this folder (TS-ARCH-05). One list call returns all items
 * (at most 500, BR-12), so there is no per-item request (API-N1-01).
 */
@Injectable()
export class HttpItems implements LoadItemsPort, AddItemPort, UpdateItemPort, DeleteItemPort, ClearCheckedItemsPort {
  private readonly api = inject(ItemsService);
  private readonly reportError = inject(REPORT_ERROR);

  /**
   * One call for all items. With the etag of the held snapshot the server answers 304 while the list did not move; the
   * browser hands that to the HttpClient as an error status, which is the normal "unchanged" answer here (ADR 0006).
   */
  async loadItems(listId: string, options?: LoadItemsOptions): Promise<ItemsLoad> {
    const headers = options?.etag ? { 'If-None-Match': options.etag } : undefined;
    try {
      const response = await untilAborted(
        this.api.listItems(listId, { observe: 'response', ...(headers ? { headers } : {}) }),
        options?.signal,
      );
      const etag = response.headers.get('ETag');
      if (!etag) throw this.reported(new TechnicalError('items API answered without an ETag'));
      return { kind: 'changed', items: this.parse(ListItemsResponse, response.body).items.map(toItem), etag };
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 304) return { kind: 'unchanged' };
      throw error instanceof TechnicalError ? error : this.reported(toItemError(error));
    }
  }

  async addItem(listId: string, text: string): Promise<Item> {
    return toItem(this.parse(AddItemResponse, await this.call(() => this.api.addItem(listId, { text }))));
  }

  async updateItem(listId: string, itemId: string, change: ItemChange): Promise<Item> {
    const dto = await this.call(() => this.api.updateItem(listId, itemId, { ...change }));
    return toItem(this.parse(UpdateItemResponse, dto));
  }

  async deleteItem(listId: string, itemId: string): Promise<void> {
    await this.call(() => this.api.deleteItem(listId, itemId));
  }

  async clearCheckedItems(listId: string, itemIds: readonly string[]): Promise<number> {
    const dto = await this.call(() => this.api.clearCheckedItems(listId, { itemIds: [...itemIds] }));
    return this.parse(ClearCheckedItemsResponse, dto).removed;
  }

  private async call(request: () => Parameters<typeof untilAborted>[0], signal?: AbortSignal): Promise<unknown> {
    try {
      return await untilAborted(request(), signal);
    } catch (error) {
      throw this.reported(toItemError(error));
    }
  }

  private parse<T>(schema: ZodType<T>, dto: unknown): T {
    const parsed = schema.safeParse(dto);
    if (!parsed.success) {
      throw this.reported(new TechnicalError('items API answered a malformed body', { cause: parsed.error }));
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
export const itemsHttpProviders: Provider[] = [ItemsService, HttpItems];
