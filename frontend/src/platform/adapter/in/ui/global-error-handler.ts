import type { ErrorHandler } from '@angular/core';
import { inject, Injectable } from '@angular/core';

import { REPORT_ERROR } from '../../../platform.tokens';

/**
 * The one ErrorHandler (NG-OBS-01): every unhandled error, including window `error` and `unhandledrejection` events
 * forwarded by provideBrowserGlobalErrorListeners(), is reported through the platform use case. Nothing else reports
 * errors or writes them to the console. The user-visible generic message (NG-SEC-11) is added with the snackbar in M1.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly reportError = inject(REPORT_ERROR);

  handleError(error: unknown): void {
    this.reportError.report(error);
  }
}
