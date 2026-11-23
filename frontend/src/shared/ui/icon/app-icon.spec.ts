import { expectNoAxeViolations } from '@testing/axe';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { AppIcon } from './app-icon';

describe('AppIcon', () => {
  it('draws the named icon as a decorative svg that assistive technology skips', async () => {
    const { container, fixture } = await render(AppIcon, { inputs: { name: 'menu' } });

    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('svg path')?.getAttribute('d')).toMatch(/^M3 18h18/);
    await expectNoAxeViolations(container);
  });

  it('draws a different path for a different name', async () => {
    const { container } = await render(AppIcon, { inputs: { name: 'close' } });

    expect(container.querySelector('svg path')?.getAttribute('d')).toMatch(/^M19 6\.41/);
  });
});
