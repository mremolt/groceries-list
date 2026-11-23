import type { ErrorReport, ErrorReportingPort } from '../../../ports/out/error-reporting-port';

/**
 * Error reporting is not wired yet (internal test release, NFR-OPS-04 is deferred): reports are dropped. The reporting
 * tool and its endpoint (`errorReporting.path` in the runtime config) replace this adapter later (NG-OBS-03).
 */
export class NoopErrorReporting implements ErrorReportingPort {
  private lastDropped: ErrorReport | undefined;

  /** The most recent dropped report (diagnostics and tests only). */
  get last(): ErrorReport | undefined {
    return this.lastDropped;
  }

  send(report: ErrorReport): void {
    this.lastDropped = report;
  }
}
