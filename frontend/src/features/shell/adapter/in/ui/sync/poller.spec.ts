import { TestBed } from '@angular/core/testing';
import { deferred } from '@testing/deferred';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PageActivity } from './page-activity';
import { Poller, type PollOutcome } from './poller';

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

function setup(outcomes: PollOutcome[] = []) {
  const run = vi.fn<() => Promise<PollOutcome>>(() => Promise.resolve(outcomes.shift() ?? 'ok'));
  const poller = new Poller({ intervalMs: 5000, maxDelayMs: 15_000, run }, TestBed.inject(PageActivity));
  return { run, poller };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  setHidden(false);
  vi.useRealTimers();
});

describe('Poller (FR-SYNC-01)', () => {
  it('polls every 5 seconds while the page is visible, the first time after one interval', async () => {
    const { run, poller } = setup();
    poller.start();

    await vi.advanceTimersByTimeAsync(4999);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('does not start the next poll before the running one has ended', async () => {
    const running = deferred<PollOutcome>();
    const run = vi.fn(() => running.promise);
    const poller = new Poller({ intervalMs: 5000, maxDelayMs: 15_000, run }, TestBed.inject(PageActivity));
    poller.start();

    await vi.advanceTimersByTimeAsync(20_000);
    expect(run).toHaveBeenCalledTimes(1);
    running.resolve('ok');
    await vi.advanceTimersByTimeAsync(5000);

    expect(run).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('pauses while the page is hidden and polls at once when it is visible again (AC2, AC3)', async () => {
    const { run, poller } = setup();
    poller.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(1);

    setHidden(true);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(run).toHaveBeenCalledTimes(1);

    setHidden(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(3);
    poller.stop();
  });

  it('polls at once when the window gets the focus or the network is back (AC2, FR-FB-06 AC3)', async () => {
    const { run, poller } = setup();
    poller.start();

    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);

    expect(run).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('waits longer after failures, at most 15 seconds, and is back to 5 seconds after a success', async () => {
    const { run, poller } = setup(['failed', 'failed', 'failed', 'failed', 'ok']);
    poller.start();

    await vi.advanceTimersByTimeAsync(5000); // 1st poll fails -> next after 10 s
    await vi.advanceTimersByTimeAsync(9999);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // 2nd fails -> 15 s (capped)
    await vi.advanceTimersByTimeAsync(14_999);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1); // 3rd fails -> still 15 s
    await vi.advanceTimersByTimeAsync(15_000); // 4th fails, 5th ok
    expect(run).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(run).toHaveBeenCalledTimes(5);
    await vi.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(6);
    poller.stop();
  });

  it('stops for good: no timer, no listener, no poll after stop (no leaks)', async () => {
    const { run, poller } = setup();
    poller.start();

    poller.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);

    expect(run).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not schedule again when it was stopped while a poll was running', async () => {
    const running = deferred<PollOutcome>();
    const run = vi.fn(() => running.promise);
    const poller = new Poller({ intervalMs: 5000, maxDelayMs: 15_000, run }, TestBed.inject(PageActivity));
    poller.start();
    await vi.advanceTimersByTimeAsync(5000);

    poller.stop();
    running.resolve('ok');
    await vi.advanceTimersByTimeAsync(60_000);

    expect(run).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
