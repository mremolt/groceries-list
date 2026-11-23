import { Component, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { expectNoAxeViolations } from '@testing/axe';
import { provideTestTranslations } from '@testing/transloco';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ValidatedField } from './validated-field';

const MESSAGES = { required: 'Bitte gib einen Namen ein.', default: 'Das passt noch nicht.' };

@Component({
  imports: [ValidatedField, FormField],
  template: `<form novalidate (submit)="$event.preventDefault(); save()">
    <app-validated-field label="Name der Liste" autocomplete="off" [formField]="f.name" [errorMessages]="messages" />
    <app-validated-field label="Notiz" [formField]="f.note" [errorMessages]="messages" />
    <button type="submit">Erstellen</button>
  </form>`,
})
class Host {
  protected readonly model = signal({ name: '', note: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.name);
    required(p.note);
  });
  protected readonly messages = MESSAGES;
  readonly submitted = vi.fn();

  protected async save(): Promise<void> {
    const ok = await submit(this.f, () => {
      this.submitted();
      return Promise.resolve();
    });
    if (!ok) this.f().errorSummary()[0]?.fieldTree().focusBoundControl();
  }
}

async function setup() {
  const view = await render(Host, { providers: provideTestTranslations() });
  return { ...view, host: view.fixture.componentInstance };
}

describe('ValidatedField', () => {
  it('shows no error while the user has not left the field or submitted', async () => {
    await setup();

    await userEvent.type(screen.getByLabelText('Name der Liste'), 'a{Backspace}');

    expect(screen.queryByText(/Fehler:/)).toBeNull();
  });

  it('shows the error after leaving an invalid field, with "Fehler:" and linked to the input', async () => {
    await setup();
    const input = screen.getByLabelText('Name der Liste');

    await userEvent.click(input);
    await userEvent.tab();

    const error = await screen.findByText('Fehler: Bitte gib einen Namen ein.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(error.closest('p')?.id ?? 'missing');
  });

  it('on a failed submit shows all errors and moves focus to the first invalid field, keeping entered values', async () => {
    const { host } = await setup();
    await userEvent.type(screen.getByLabelText('Notiz'), 'Milch');
    await userEvent.type(screen.getByLabelText('Notiz'), '{Backspace>5}');
    await userEvent.type(screen.getByLabelText('Notiz'), 'Eier');

    await userEvent.click(screen.getByRole('button', { name: 'Erstellen' }));

    expect(screen.getAllByText(/Fehler:/)).toHaveLength(1);
    expect(host.submitted).not.toHaveBeenCalled();
    await expect.poll(() => document.activeElement).toBe(screen.getByLabelText('Name der Liste'));
    expect((screen.getByLabelText('Notiz') as HTMLInputElement).value).toBe('Eier');
  });

  it('submits when the form is valid', async () => {
    const { host } = await setup();
    await userEvent.type(screen.getByLabelText('Name der Liste'), 'Wocheneinkauf');
    await userEvent.type(screen.getByLabelText('Notiz'), 'x');

    await userEvent.click(screen.getByRole('button', { name: 'Erstellen' }));

    expect(host.submitted).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations in the valid and in the error state', async () => {
    const { container } = await setup();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Erstellen' }));
    await screen.findAllByText(/Fehler:/);

    await expectNoAxeViolations(container);
  });
});
