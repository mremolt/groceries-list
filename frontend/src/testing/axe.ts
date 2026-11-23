import axe from 'axe-core';
import { expect } from 'vitest';

/** TS-TEST-09: axe on a rendered state. Layout-dependent rules run in the browser tier (L4, TS-TEST-21). */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const { violations } = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false }, // no layout in jsdom; checked in E2E (L4)
      'target-size': { enabled: false }, // same; a jsdom run would report a false pass (TS-TEST-21)
    },
  });
  expect(violations).toEqual([]);
}
