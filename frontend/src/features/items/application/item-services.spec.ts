import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Item } from '../domain/item';
import { ItemTextInvalidError } from '../domain/item-errors';
import type { AddItemPort } from '../ports/out/add-item-port';
import type { ClearCheckedItemsPort } from '../ports/out/clear-checked-items-port';
import type { DeleteItemPort } from '../ports/out/delete-item-port';
import type { LoadItemsPort } from '../ports/out/load-items-port';
import type { UpdateItemPort } from '../ports/out/update-item-port';
import { AddItemService } from './add-item-service';
import { ClearCheckedItemsService } from './clear-checked-items-service';
import { DeleteItemService } from './delete-item-service';
import { EditItemService } from './edit-item-service';
import { LoadItemsService } from './load-items-service';
import { SetItemDoneService } from './set-item-done-service';

const MILK: Item = { id: 'i1', text: '2× Milch', done: false, createdAt: '2026-11-23T10:00:00Z', version: 1 };

describe('AddItemService', () => {
  it('adds the trimmed text', async () => {
    const port = mock<AddItemPort>();
    port.addItem.mockResolvedValue(MILK);

    expect(await new AddItemService(port).execute('l1', '  2× Milch ')).toBe(MILK);

    expect(port.addItem.mock.calls).toEqual([['l1', '2× Milch']]);
  });

  it('refuses an empty text without calling the port (FR-ITEM-01 AC4)', async () => {
    const port = mock<AddItemPort>();

    await expect(new AddItemService(port).execute('l1', ' ')).rejects.toEqual(new ItemTextInvalidError('required'));

    expect(port.addItem.mock.calls).toHaveLength(0);
  });
});

describe('EditItemService', () => {
  it('saves only the trimmed text (FR-ITEM-03 AC2)', async () => {
    const port = mock<UpdateItemPort>();
    port.updateItem.mockResolvedValue(MILK);

    await new EditItemService(port).execute('l1', 'i1', ' Hafermilch ');

    expect(port.updateItem.mock.calls).toEqual([['l1', 'i1', { text: 'Hafermilch' }]]);
  });

  it('refuses a text over 200 characters', async () => {
    const port = mock<UpdateItemPort>();

    await expect(new EditItemService(port).execute('l1', 'i1', 'a'.repeat(201))).rejects.toEqual(
      new ItemTextInvalidError('tooLong'),
    );
    expect(port.updateItem.mock.calls).toHaveLength(0);
  });
});

describe('SetItemDoneService', () => {
  it('sets the done state as an idempotent set, not a toggle (ADR 0007)', async () => {
    const port = mock<UpdateItemPort>();
    port.updateItem.mockResolvedValue({ ...MILK, done: true });

    const item = await new SetItemDoneService(port).execute('l1', 'i1', true);

    expect(item.done).toBe(true);
    expect(port.updateItem.mock.calls).toEqual([['l1', 'i1', { done: true }]]);
  });
});

describe('DeleteItemService and LoadItemsService', () => {
  it('delete the item', async () => {
    const port = mock<DeleteItemPort>();

    await new DeleteItemService(port).execute('l1', 'i1');

    expect(port.deleteItem.mock.calls).toEqual([['l1', 'i1']]);
  });

  it('load the items of the list with the abort signal and the held etag', async () => {
    const port = mock<LoadItemsPort>();
    const load = { kind: 'changed', items: [MILK], etag: '"2"' } as const;
    port.loadItems.mockResolvedValue(load);
    const options = { signal: new AbortController().signal, etag: '"1"' };

    expect(await new LoadItemsService(port).execute('l1', options)).toEqual(load);

    expect(port.loadItems.mock.calls).toEqual([['l1', options]]);
  });
});

describe('ClearCheckedItemsService (FR-ITEM-05 AC4)', () => {
  it('sends exactly the ids it was given', async () => {
    const port = mock<ClearCheckedItemsPort>();
    port.clearCheckedItems.mockResolvedValue(2);

    expect(await new ClearCheckedItemsService(port).execute('l1', ['i1', 'i2'])).toBe(2);

    expect(port.clearCheckedItems.mock.calls).toEqual([['l1', ['i1', 'i2']]]);
  });

  it('does not call the server without ids', async () => {
    const port = mock<ClearCheckedItemsPort>();

    expect(await new ClearCheckedItemsService(port).execute('l1', [])).toBe(0);

    expect(port.clearCheckedItems.mock.calls).toHaveLength(0);
  });
});
