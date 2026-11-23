import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageActivity } from './page-activity';

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  setHidden(false);
});

describe('PageActivity (FR-SYNC-01 AC2/AC3)', () => {
  it('follows the visibility of the page', () => {
    const activity = TestBed.inject(PageActivity);
    expect(activity.visible()).toBe(true);

    setHidden(true);
    expect(activity.visible()).toBe(false);

    setHidden(false);
    expect(activity.visible()).toBe(true);
  });

  it('tells the listeners when the page becomes visible, gets the focus or the network is back, not when it hides', () => {
    const activity = TestBed.inject(PageActivity);
    const resumed = vi.fn();
    activity.onResume(resumed);

    setHidden(true);
    expect(resumed).not.toHaveBeenCalled();
    setHidden(false);
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));

    expect(resumed).toHaveBeenCalledTimes(3);
  });

  it('stops telling a listener that unsubscribed', () => {
    const activity = TestBed.inject(PageActivity);
    const resumed = vi.fn();
    const unsubscribe = activity.onResume(resumed);

    unsubscribe();
    window.dispatchEvent(new Event('focus'));

    expect(resumed).not.toHaveBeenCalled();
  });

  it('tells the offline listeners when the browser goes offline', () => {
    const activity = TestBed.inject(PageActivity);
    const offline = vi.fn();
    activity.onOffline(offline);

    window.dispatchEvent(new Event('offline'));

    expect(offline).toHaveBeenCalledOnce();
  });

  it('removes its listeners with the injector, so nothing leaks', () => {
    const activity = TestBed.inject(PageActivity);
    const resumed = vi.fn();
    activity.onResume(resumed);

    TestBed.resetTestingModule();
    window.dispatchEvent(new Event('focus'));

    expect(resumed).not.toHaveBeenCalled();
  });
});
