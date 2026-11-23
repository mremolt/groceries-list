import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Item, ItemsLoad } from '@features/items';
import { TranslocoService } from '@jsverse/transloco';
import { TechnicalError } from '@platform/domain';
import { Snackbar } from '@shared/ui/snackbar/snackbar';
import { provideTestAnnouncer } from '@testing/announcer';
import { BREAD, EGGS, itemUseCaseFakes, MILK, snapshot } from '@testing/item-use-cases';
import { listUseCaseFakes, WEEK } from '@testing/list-use-cases';
import { provideTestTranslations } from '@testing/transloco';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ItemsStore } from '../items-store';
import { ListsStore } from '../lists-store';
import { ConnectionMonitor } from './connection-monitor';
import { ListSync } from './list-sync';

async function setup() {
  const items = itemUseCaseFakes([MILK, BREAD]);
  const lists = listUseCaseFakes([WEEK]);
  const announce = vi.fn<(message: string) => void>();
  TestBed.configureTestingModule({
    providers: [
      ...items.providers,
      ...lists.providers,
      ListSync,
      Snackbar,
      ...provideTestAnnouncer(announce),
      provideRouter([]),
      ...provideTestTranslations(),
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load('de')); // the catalog is there before the clock is faked
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  await TestBed.inject(ListsStore).reload();
  await TestBed.inject(ItemsStore).load('l1');
  const sync = TestBed.inject(ListSync);
  items.fakes.loadItems.execute.mockClear();
  lists.fakes.loadMyLists.execute.mockClear();
  return {
    sync,
    announce,
    navigate,
    fakes: items.fakes,
    listFakes: lists.fakes,
    snackbar: TestBed.inject(Snackbar),
    monitor: TestBed.inject(ConnectionMonitor),
    items: TestBed.inject(ItemsStore),
    lists: TestBed.inject(ListsStore),
  };
}

function load(items: readonly Item[], etag: string): ItemsLoad {
  return snapshot(items, etag);
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ListSync items (FR-SYNC-01)', () => {
  it('polls the open list every 5 seconds with the etag it holds', async () => {
    const { sync, fakes } = await setup();
    fakes.loadItems.execute.mockResolvedValue({ kind: 'unchanged' });
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(fakes.loadItems.execute.mock.calls).toHaveLength(2);
    expect(fakes.loadItems.execute.mock.calls[0]).toEqual(['l1', expect.objectContaining({ etag: '"1"' })]);
  });

  it('stops polling when the page is destroyed: no timer, no request (no leaks)', async () => {
    const { sync, fakes } = await setup();
    fakes.loadItems.execute.mockResolvedValue({ kind: 'unchanged' });
    sync.start('l1');

    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(fakes.loadItems.execute.mock.calls).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts over for another list', async () => {
    const { sync, fakes } = await setup();
    fakes.loadItems.execute.mockResolvedValue({ kind: 'unchanged' });
    sync.start('l1');

    sync.start('l2');
    await vi.advanceTimersByTimeAsync(5000);

    expect(fakes.loadItems.execute.mock.calls).toHaveLength(0); // the store still holds l1, nothing to poll for l2
    sync.stop();
  });
});

describe('ListSync announcements (FR-SYNC-04)', () => {
  it('announces what others changed once per sync, politely', async () => {
    const { sync, fakes, announce } = await setup();
    fakes.loadItems.execute.mockResolvedValue(
      load([{ ...MILK, done: true, version: 2 }, BREAD, EGGS, { ...EGGS, id: 'i9', text: 'Käse' }], '"2"'),
    );
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(5000);

    expect(announce.mock.calls).toHaveLength(1);
    expect(announce.mock.calls.at(-1)).toEqual(['Liste aktualisiert: 2 neue Artikel, 1 erledigt.']);
  });

  it("says nothing when nothing changed, and nothing for the person's own changes", async () => {
    const { sync, fakes, announce, items } = await setup();
    fakes.setItemDone.execute.mockResolvedValue({ ...MILK, done: true, version: 2 });
    await items.setDone('i1', true);
    fakes.loadItems.execute.mockResolvedValueOnce(load([{ ...MILK, done: true, version: 2 }, BREAD], '"2"'));
    fakes.loadItems.execute.mockResolvedValue({ kind: 'unchanged' });
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(10_000);

    expect(announce.mock.calls).toHaveLength(0);
  });

  it('uses the singular for one change', async () => {
    const { sync, fakes, announce } = await setup();
    fakes.loadItems.execute.mockResolvedValue(load([MILK], '"2"'));
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(5000);

    expect(announce.mock.calls.at(-1)).toEqual(['Liste aktualisiert: 1 Artikel entfernt.']);
  });
});

describe('ListSync lists (FR-SYNC-03)', () => {
  it('reads the lists again when the items moved, so a rename or a count reaches the drawer within seconds', async () => {
    const { sync, fakes, listFakes, lists } = await setup();
    fakes.loadItems.execute.mockResolvedValue(load([MILK, BREAD, EGGS], '"2"'));
    listFakes.loadMyLists.execute.mockResolvedValue([{ ...WEEK, name: 'Großeinkauf', revision: 4 }]);
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(5000);

    expect(listFakes.loadMyLists.execute.mock.calls).toHaveLength(1);
    expect(lists.lists()[0]?.name).toBe('Großeinkauf');
  });

  it('shows the open count of the items it just read, not the older number of the lists answer', async () => {
    const { sync, fakes, listFakes, lists } = await setup();
    fakes.loadItems.execute.mockResolvedValue(load([MILK, BREAD, EGGS], '"2"'));
    listFakes.loadMyLists.execute.mockResolvedValue([{ ...WEEK, openCount: 1 }]);
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(5000);

    expect(lists.lists()[0]?.openCount).toBe(3);
  });

  it('does not read the lists when the items did not change', async () => {
    const { sync, fakes, listFakes } = await setup();
    fakes.loadItems.execute.mockResolvedValue({ kind: 'unchanged' });
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(5000);

    expect(listFakes.loadMyLists.execute.mock.calls).toHaveLength(0);
  });
});

describe('ListSync removed list (FR-SYNC-05)', () => {
  it('tells the person, goes to the next list or the empty state and stops polling', async () => {
    const { sync, fakes, listFakes, snackbar, navigate } = await setup();
    fakes.loadItems.execute.mockRejectedValue(new (await import('@features/items')).ItemListNotFoundError());
    listFakes.loadMyLists.execute.mockResolvedValue([]);
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(5000);

    expect(snackbar.message()?.text).toBe('Diese Liste wurde gelöscht.');
    expect(navigate.mock.calls).toEqual([['/']]);
    expect(listFakes.loadMyLists.execute.mock.calls.length).toBeGreaterThan(0);
    fakes.loadItems.execute.mockClear();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fakes.loadItems.execute.mock.calls).toHaveLength(0);
  });

  it('says nothing about a list the person deleted or left themselves', async () => {
    const { sync, fakes, listFakes, snackbar, navigate, lists } = await setup();
    listFakes.deleteList.execute.mockResolvedValue(undefined);
    await lists.delete('l1');
    fakes.loadItems.execute.mockRejectedValue(new (await import('@features/items')).ItemListNotFoundError());
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(5000);

    expect(snackbar.message()).toBeNull();
    expect(navigate.mock.calls).toHaveLength(0);
  });
});

describe('ListSync connection (FR-FB-06)', () => {
  it('reports unreachable polls without any error message, and a success ends it', async () => {
    const { sync, fakes, monitor, snackbar } = await setup();
    fakes.loadItems.execute.mockRejectedValue(new TechnicalError('offline'));
    sync.start('l1');

    await vi.advanceTimersByTimeAsync(5000); // first failed poll
    expect(monitor.offline()).toBe(false);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(monitor.offline()).toBe(true);
    expect(snackbar.message()).toBeNull();

    fakes.loadItems.execute.mockResolvedValue({ kind: 'unchanged' });
    await vi.advanceTimersByTimeAsync(15_000);

    expect(monitor.offline()).toBe(false);
  });
});
