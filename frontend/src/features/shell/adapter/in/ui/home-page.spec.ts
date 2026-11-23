import { expectNoAxeViolations } from '@testing/axe';
import { provideTestTranslations } from '@testing/transloco';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { HomePage } from './home-page';

describe('HomePage', () => {
  it('shows the app name as the one main heading', async () => {
    await render(HomePage, { providers: provideTestTranslations() });

    expect(await screen.findByRole('heading', { level: 1, name: 'Einkaufsliste' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('has a main landmark with the welcome card as a second-level section', async () => {
    await render(HomePage, { providers: provideTestTranslations() });

    const main = await screen.findByRole('main');
    expect(main.querySelector('h2')?.textContent).toBe('Willkommen');
  });

  it('has no accessibility violations', async () => {
    const { container } = await render(HomePage, { providers: provideTestTranslations() });
    await screen.findByRole('main');

    await expectNoAxeViolations(container);
  });
});
