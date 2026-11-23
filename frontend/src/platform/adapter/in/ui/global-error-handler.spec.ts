import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { REPORT_ERROR } from '../../../platform.tokens';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  it('forwards an unhandled error to the report use case', () => {
    const report = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: REPORT_ERROR, useValue: { report } },
        GlobalErrorHandler,
        { provide: ErrorHandler, useExisting: GlobalErrorHandler },
      ],
    });
    const failure = new TypeError('boom');

    TestBed.inject(ErrorHandler).handleError(failure);

    expect(report).toHaveBeenCalledWith(failure);
  });
});
