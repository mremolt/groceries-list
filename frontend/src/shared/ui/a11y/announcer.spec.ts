import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { mock } from 'vitest-mock-extended';
import { describe, expect, it } from 'vitest';

import { Announcer, CdkAnnouncer } from './announcer';

describe('CdkAnnouncer', () => {
  it('announces politely through the CDK live announcer', () => {
    const live = mock<LiveAnnouncer>();
    TestBed.configureTestingModule({
      providers: [
        { provide: LiveAnnouncer, useValue: live },
        { provide: Announcer, useClass: CdkAnnouncer },
      ],
    });

    TestBed.inject(Announcer).announce('Liste aktualisiert');

    expect(live.announce).toHaveBeenCalledWith('Liste aktualisiert', 'polite');
  });
});
