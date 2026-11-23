import { MatDialog } from '@angular/material/dialog';
import { TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '@testing/axe';
import { fireEvent, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ConfirmDialogs } from './confirm-dialog';

const DATA = {
  title: '„Wocheneinkauf“ löschen?',
  text: 'Die Liste wird für alle Mitglieder gelöscht. Das kann nicht rückgängig gemacht werden.',
  confirmLabel: 'Löschen',
  cancelLabel: 'Abbrechen',
  destructive: true,
};

function setup() {
  TestBed.configureTestingModule({});
  return new ConfirmDialogs(TestBed.inject(MatDialog));
}

describe('ConfirmDialogs', () => {
  it('names the dialog by its title and describes it by its text', async () => {
    const dialogs = setup();
    void dialogs.confirm(DATA);

    const dialog = await screen.findByRole('dialog', { name: '„Wocheneinkauf“ löschen?' });

    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-dialog-text');
    expect(dialog.querySelector('#confirm-dialog-text')?.textContent).toContain('nicht rückgängig');
  });

  it('puts focus on the least destructive button', async () => {
    const dialogs = setup();
    void dialogs.confirm(DATA);

    const cancel = await screen.findByRole('button', { name: 'Abbrechen' });

    await expect.poll(() => document.activeElement).toBe(cancel);
  });

  it('answers true when the user confirms', async () => {
    const dialogs = setup();
    const answer = dialogs.confirm(DATA);

    await userEvent.click(await screen.findByRole('button', { name: 'Löschen' }));

    expect(await answer).toBe(true);
  });

  it('answers false on cancel', async () => {
    const dialogs = setup();
    const answer = dialogs.confirm(DATA);

    await userEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }));

    expect(await answer).toBe(false);
  });

  it('answers false on Esc, like cancel', async () => {
    const dialogs = setup();
    const answer = dialogs.confirm(DATA);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', keyCode: 27 }); // CDK reads keyCode

    expect(await answer).toBe(false);
  });

  it('returns focus to the element that opened it', async () => {
    const dialogs = setup();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const answer = dialogs.confirm(DATA);
    await userEvent.click(await screen.findByRole('button', { name: 'Abbrechen' }));
    await answer;

    await expect.poll(() => document.activeElement).toBe(opener);
    opener.remove();
  });

  it('has no accessibility violations', async () => {
    const dialogs = setup();
    void dialogs.confirm(DATA);
    const dialog = await screen.findByRole('dialog');

    await expectNoAxeViolations(dialog);
  });
});
