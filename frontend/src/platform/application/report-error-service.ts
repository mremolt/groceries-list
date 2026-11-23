import type { ReportErrorUseCase } from '../ports/in/report-error-use-case';
import type { ErrorReportingPort } from '../ports/out/error-reporting-port';

const MAX_REPORTS_PER_PAGE_LOAD = 20;

/** Builds a scrubbed report, drops duplicates and caps the volume per page load (NG-OBS-02, NG-OBS-05). */
export class ReportErrorService implements ReportErrorUseCase {
  private readonly seen = new Set<string>();

  constructor(private readonly port: ErrorReportingPort) {}

  report(error: unknown): void {
    const name = error instanceof Error ? error.name : 'NonError';
    // Messages may carry form values or tokens: only the error name and a coarse message class leave the app.
    const message = error instanceof Error ? name : 'non-error value thrown';
    const fingerprint = `${name}:${message}`;
    if (this.seen.has(fingerprint) || this.seen.size >= MAX_REPORTS_PER_PAGE_LOAD) {
      return;
    }
    this.seen.add(fingerprint);
    this.port.send({ fingerprint, name, message });
  }
}
