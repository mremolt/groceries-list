import { MediaMatcher } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { BreakpointWindowSize, toSizeClass, WindowSize } from './window-size';

describe('toSizeClass', () => {
  it.each([
    [false, false, 'compact'],
    [true, false, 'medium'],
    [true, true, 'expanded'],
    [false, true, 'expanded'],
  ] as const)('maps medium=%s expanded=%s to %s', (medium, expanded, expected) => {
    expect(toSizeClass(medium, expanded)).toBe(expected);
  });
});

/** A fake MediaMatcher whose queries answer for a given viewport width (NG-TEST-10). */
function fakeMatcher(width: number): MediaMatcher {
  return {
    matchMedia: (query: string) => {
      const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? '0');
      return {
        matches: width >= min,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
      } as unknown as MediaQueryList;
    },
  } as MediaMatcher;
}

describe('BreakpointWindowSize', () => {
  it.each([
    [390, 'compact'],
    [768, 'medium'],
    [1280, 'expanded'],
  ] as const)('reports %i px as %s', (width, expected) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MediaMatcher, useValue: fakeMatcher(width) },
        { provide: WindowSize, useClass: BreakpointWindowSize },
      ],
    });

    expect(TestBed.inject(WindowSize).sizeClass()).toBe(expected);
  });
});
