import { TestBed } from '@angular/core/testing';
import { TechnicalError } from '@platform/domain';
import { itemUseCaseFakes, MILK } from '@testing/item-use-cases';
import { listUseCaseFakes, WEEK } from '@testing/list-use-cases';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ItemsStore } from '../items-store';
import { ListsStore } from '../lists-store';
import { ConnectionMonitor } from './connection-monitor';
import { ShellSync } from './shell-sync';

async function setup() {
  const items = itemUseCaseFakes([MILK]);
  const lists = listUseCaseFakes([WEEK]);
  TestBed.configureTestingModule({ providers: [...items.providers, ...lists.providers, ShellSync] });
  await TestBed.inject(ListsStore).reload();
  lists.fakes.loadMyLists.execute.mockClear();
  return {
    sync: TestBed.inject(ShellSync),
    listFakes: lists.fakes,
    monitor: TestBed.inject(ConnectionMonitor),
    lists: TestBed.inject(ListsStore),
    items: TestBed.inject(ItemsStore),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ShellSync (FR-SYNC-03)', () => {
  it('reads the lists every 30 seconds, so new, renamed and counted lists reach the drawer', async () => {
    const { sync, listFakes, lists } = await setup();
    listFakes.loadMyLists.execute.mockResolvedValue([{ ...WEEK, name: 'Großeinkauf', openCount: 4 }]);
    sync.start();

    await vi.advanceTimersByTimeAsync(29_999);
    expect(listFakes.loadMyLists.execute.mock.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);

    expect(listFakes.loadMyLists.execute.mock.calls).toHaveLength(1);
    expect(lists.lists()[0]).toMatchObject({ name: 'Großeinkauf', openCount: 4 });
    sync.stop();
  });

  it('reads the lists at once when the window gets the focus', async () => {
    const { sync, listFakes } = await setup();
    sync.start();

    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);

    expect(listFakes.loadMyLists.execute.mock.calls).toHaveLength(1);
    sync.stop();
  });

  it('keeps the open count of the open list from its items, which are newer than the lists answer', async () => {
    const { sync, listFakes, lists, items } = await setup();
    await items.load('l1'); // one open item
    listFakes.loadMyLists.execute.mockResolvedValue([{ ...WEEK, openCount: 9 }]);
    sync.start();

    await vi.advanceTimersByTimeAsync(30_000);

    expect(lists.lists()[0]?.openCount).toBe(1);
    sync.stop();
  });

  it('tells the connection monitor and shows no error when the server cannot be reached (FR-FB-06)', async () => {
    const { sync, listFakes, monitor, lists } = await setup();
    listFakes.loadMyLists.execute.mockRejectedValue(new TechnicalError('offline'));
    sync.start();

    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(10_001);

    expect(monitor.offline()).toBe(true);
    expect(lists.status()).toBe('ready');
    sync.stop();
  });

  it('stops with its injector (no leaks)', async () => {
    const { sync, listFakes } = await setup();
    sync.start();

    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(listFakes.loadMyLists.execute.mock.calls).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
