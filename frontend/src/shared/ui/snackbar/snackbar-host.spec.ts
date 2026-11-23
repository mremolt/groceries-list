import { expectNoAxeViolations } from '@testing/axe';
import { provideTestTranslations } from '@testing/transloco';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Snackbar, SNACKBAR_DURATION_MS } from './snackbar';
import { SnackbarHost } from './snackbar-host';

async function setup() {
  const view = await render(SnackbarHost, { providers: [Snackbar, ...provideTestTranslations()] });
  return { ...view, snackbar: view.fixture.debugElement.injector.get(Snackbar) };
}

describe('SnackbarHost', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps an empty polite status region so that the first message is announced', async () => {
    await setup();

    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent.trim()).toBe('');
  });

  it('shows the message in the status region and does not take focus', async () => {
    const { snackbar, fixture } = await setup();
    const before = document.activeElement;

    snackbar.show('Liste erstellt');
    await fixture.whenStable();

    expect(screen.getByRole('status').textContent).toContain('Liste erstellt');
    expect(document.activeElement).toBe(before);
  });

  it('closes with the close button, named "Hinweis schließen"', async () => {
    const { snackbar, fixture } = await setup();
    snackbar.show('Gespeichert');
    await fixture.whenStable();

    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
      .click(screen.getByRole('button', { name: 'Hinweis schließen' }));
    await fixture.whenStable();

    expect(screen.getByRole('status').textContent.trim()).toBe('');
  });

  it('replaces the current message with a new one', async () => {
    const { snackbar, fixture } = await setup();
    snackbar.show('Liste erstellt');
    snackbar.show('Gespeichert');
    await fixture.whenStable();

    const text = screen.getByRole('status').textContent;
    expect(text).toContain('Gespeichert');
    expect(text).not.toContain('Liste erstellt');
  });

  it('hides after the duration', async () => {
    const { snackbar, fixture } = await setup();
    snackbar.show('Gespeichert');

    vi.advanceTimersByTime(SNACKBAR_DURATION_MS);
    await fixture.whenStable();

    expect(screen.getByRole('status').textContent.trim()).toBe('');
  });

  it('stays while hovered and starts counting again after the pointer leaves', async () => {
    const { snackbar, fixture } = await setup();
    snackbar.show('Gespeichert');
    snackbar.pause();

    vi.advanceTimersByTime(SNACKBAR_DURATION_MS * 3);
    await fixture.whenStable();
    expect(screen.getByRole('status').textContent).toContain('Gespeichert');

    snackbar.resume();
    vi.advanceTimersByTime(SNACKBAR_DURATION_MS - 1);
    expect(snackbar.message()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(snackbar.message()).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { snackbar, fixture, container } = await setup();
    snackbar.show('Link kopiert');
    await fixture.whenStable();
    vi.useRealTimers(); // axe needs real timers

    await expectNoAxeViolations(container);
  });
});
