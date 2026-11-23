import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalStorageOpenedList } from './local-storage-opened-list';

describe('LocalStorageOpenedList', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [LocalStorageOpenedList] });
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('recalls nothing before a list was opened', () => {
    expect(TestBed.inject(LocalStorageOpenedList).recall()).toBeNull();
  });

  it('recalls the list remembered on this device', () => {
    const memory = TestBed.inject(LocalStorageOpenedList);

    memory.remember('l1');

    expect(memory.recall()).toBe('l1');
    expect(localStorage.getItem('lastListId')).toBe('l1');
  });
});
