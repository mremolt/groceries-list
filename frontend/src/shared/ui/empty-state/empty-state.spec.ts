import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { expectNoAxeViolations } from '@testing/axe';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState, MatButton],
  template: `<app-empty-state icon="cart" heading="Noch keine Listen" text="Lege deine erste Einkaufsliste an.">
    <button matButton="filled" empty-action type="button">Neue Liste</button>
    <p empty-hint>Du hast einen Teilen-Link bekommen?</p>
  </app-empty-state>`,
})
class Host {}

describe('EmptyState', () => {
  it('shows heading, text, projected action and hint', async () => {
    await render(Host);

    expect(screen.getByRole('heading', { level: 2, name: 'Noch keine Listen' })).toBeTruthy();
    expect(screen.getByText('Lege deine erste Einkaufsliste an.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Neue Liste' })).toBeTruthy();
    expect(screen.getByText('Du hast einen Teilen-Link bekommen?')).toBeTruthy();
  });

  it('has no accessibility violations', async () => {
    const { container } = await render(Host);

    await expectNoAxeViolations(container);
  });
});
