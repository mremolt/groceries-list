import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionMonitor } from './connection-monitor';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ConnectionMonitor (FR-FB-06)', () => {
  it('is online at first', () => {
    expect(TestBed.inject(ConnectionMonitor).offline()).toBe(false);
  });

  it('says offline only after the server could not be reached for more than 10 seconds (AC1)', async () => {
    const monitor = TestBed.inject(ConnectionMonitor);

    monitor.reportFailure();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(monitor.offline()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(monitor.offline()).toBe(true);
  });

  it('keeps counting from the first failure, not from the last', async () => {
    const monitor = TestBed.inject(ConnectionMonitor);

    monitor.reportFailure();
    await vi.advanceTimersByTimeAsync(6000);
    monitor.reportFailure();
    await vi.advanceTimersByTimeAsync(4001);

    expect(monitor.offline()).toBe(true);
  });

  it('is online again at once after a success (AC3) and a short outage never shows', async () => {
    const monitor = TestBed.inject(ConnectionMonitor);
    monitor.reportFailure();
    await vi.advanceTimersByTimeAsync(5000);
    monitor.reportSuccess();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(monitor.offline()).toBe(false);

    monitor.reportFailure();
    await vi.advanceTimersByTimeAsync(10_001);
    expect(monitor.offline()).toBe(true);
    monitor.reportSuccess();

    expect(monitor.offline()).toBe(false);
  });

  it('treats the browser going offline as a failure that starts the 10 seconds', async () => {
    const monitor = TestBed.inject(ConnectionMonitor);

    window.dispatchEvent(new Event('offline'));
    await vi.advanceTimersByTimeAsync(10_001);

    expect(monitor.offline()).toBe(true);
  });

  it('leaves no timer behind when the injector is destroyed', () => {
    TestBed.inject(ConnectionMonitor).reportFailure();

    TestBed.resetTestingModule();

    expect(vi.getTimerCount()).toBe(0);
  });
});
