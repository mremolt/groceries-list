import { TestBed } from '@angular/core/testing';
import {
  type CurrentUser,
  DELETE_ACCOUNT,
  type DeleteAccountUseCase,
  DisplayNameInvalidError,
  LOAD_CURRENT_USER,
  type LoadCurrentUserUseCase,
  NotAuthenticatedError,
  ReauthenticationRequiredError,
  UPDATE_DISPLAY_NAME,
  type UpdateDisplayNameUseCase,
} from '@features/session';
import { TechnicalError } from '@platform/domain';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { SettingsStore } from './settings-store';

const USER: CurrentUser = { id: 'u1', displayName: 'Mara', email: 'mara@example.test' };

function setup() {
  const loadUser = mock<LoadCurrentUserUseCase>();
  const updateName = mock<UpdateDisplayNameUseCase>();
  const deleteAccount = mock<DeleteAccountUseCase>();
  loadUser.execute.mockResolvedValue(USER);
  TestBed.configureTestingModule({
    providers: [
      SettingsStore,
      { provide: LOAD_CURRENT_USER, useValue: loadUser },
      { provide: UPDATE_DISPLAY_NAME, useValue: updateName },
      { provide: DELETE_ACCOUNT, useValue: deleteAccount },
    ],
  });
  return { store: TestBed.inject(SettingsStore), loadUser, updateName, deleteAccount };
}

describe('SettingsStore.load', () => {
  it('starts loading and shows the person when loaded (FR-SET-01, FR-SET-03)', async () => {
    const { store } = setup();
    expect(store.status()).toBe('loading');

    await store.load();

    expect(store.status()).toBe('ready');
    expect(store.user()).toEqual(USER);
  });

  it.each([new TechnicalError('down'), new NotAuthenticatedError()])('fails visibly for %s', async (error) => {
    const { store, loadUser } = setup();
    loadUser.execute.mockRejectedValue(error);

    await store.load();

    expect(store.status()).toBe('failed');
    expect(store.user()).toBeNull();
  });

  it('lets an unexpected error through (TS-ARCH-23)', async () => {
    const { store, loadUser } = setup();
    loadUser.execute.mockRejectedValue(new TypeError('bug'));

    await expect(store.load()).rejects.toBeInstanceOf(TypeError);
  });
});

describe('SettingsStore.saveName', () => {
  it('saves and shows the updated person (FR-SET-01 AC1)', async () => {
    const { store, updateName } = setup();
    await store.load();
    updateName.execute.calledWith('Mara K').mockResolvedValue({ ...USER, displayName: 'Mara K' });

    expect(await store.saveName('Mara K')).toEqual({ ok: true });
    expect(store.user()?.displayName).toBe('Mara K');
    expect(store.saving()).toBe(false);
  });

  it.each(['required', 'tooLong'] as const)('answers the refused name (%s) and keeps the old one', async (problem) => {
    const { store, updateName } = setup();
    await store.load();
    updateName.execute.mockRejectedValue(new DisplayNameInvalidError(problem));

    expect(await store.saveName('x')).toEqual({ ok: false, reason: problem });
    expect(store.user()?.displayName).toBe('Mara');
  });

  it('answers failed for a technical error', async () => {
    const { store, updateName } = setup();
    await store.load();
    updateName.execute.mockRejectedValue(new TechnicalError('down'));

    expect(await store.saveName('Mara K')).toEqual({ ok: false, reason: 'failed' });
    expect(store.saving()).toBe(false);
  });

  it('does not save twice at once (UI-20)', async () => {
    const { store, updateName } = setup();
    await store.load();
    let finish: ((user: CurrentUser) => void) | undefined;
    updateName.execute.mockReturnValue(
      new Promise<CurrentUser>((resolve) => {
        finish = resolve;
      }),
    );

    const first = store.saveName('A');
    const second = await store.saveName('B');
    finish?.({ ...USER, displayName: 'A' });
    await first;

    expect(second).toEqual({ ok: false, reason: 'failed' });
    expect(updateName.execute.mock.calls).toHaveLength(1);
  });
});

describe('SettingsStore.deleteAccount', () => {
  it('answers deleted on success (FR-SET-04 AC2)', async () => {
    const { store, deleteAccount } = setup();
    deleteAccount.execute.mockResolvedValue();

    expect(await store.deleteAccount()).toBe('deleted');
  });

  it('answers reauthenticate when the identity provider has not confirmed the password recently', async () => {
    const { store, deleteAccount } = setup();
    deleteAccount.execute.mockRejectedValue(new ReauthenticationRequiredError());

    expect(await store.deleteAccount()).toBe('reauthenticate');
    expect(store.deleting()).toBe(false);
  });

  it('answers failed for a technical error and can try again', async () => {
    const { store, deleteAccount } = setup();
    deleteAccount.execute.mockRejectedValueOnce(new TechnicalError('down')).mockResolvedValueOnce();

    expect(await store.deleteAccount()).toBe('failed');
    expect(await store.deleteAccount()).toBe('deleted');
  });

  it('does not delete twice at once (UI-20)', async () => {
    const { store, deleteAccount } = setup();
    let finish: (() => void) | undefined;
    deleteAccount.execute.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );

    const first = store.deleteAccount();
    const second = await store.deleteAccount();
    finish?.();
    await first;

    expect(second).toBe('failed');
    expect(deleteAccount.execute.mock.calls).toHaveLength(1);
  });
});
