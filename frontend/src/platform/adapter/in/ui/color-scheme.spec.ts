import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ColorScheme } from './color-scheme';

function create(): { scheme: ColorScheme; root: HTMLElement } {
  TestBed.configureTestingModule({ providers: [ColorScheme] });
  const scheme = TestBed.inject(ColorScheme);
  return { scheme, root: TestBed.inject(DOCUMENT).documentElement };
}

describe('ColorScheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-color-scheme');
  });

  it('follows the system by default: no attribute on <html>', () => {
    const { scheme, root } = create();

    TestBed.tick();

    expect(scheme.preference()).toBe('system');
    expect(root.hasAttribute('data-color-scheme')).toBe(false);
  });

  it('applies and stores an explicit dark choice for this device', () => {
    const { scheme, root } = create();

    scheme.set('dark');
    TestBed.tick();

    expect(root.getAttribute('data-color-scheme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('goes back to the system setting', () => {
    const { scheme, root } = create();
    scheme.set('light');
    TestBed.tick();

    scheme.set('system');
    TestBed.tick();

    expect(root.hasAttribute('data-color-scheme')).toBe(false);
  });

  it('restores the stored choice on the next visit', () => {
    localStorage.setItem('theme', 'light');

    const { scheme, root } = create();
    TestBed.tick();

    expect(scheme.preference()).toBe('light');
    expect(root.getAttribute('data-color-scheme')).toBe('light');
  });

  it('ignores an invalid stored value', () => {
    localStorage.setItem('theme', 'neon');

    expect(create().scheme.preference()).toBe('system');
  });
});
