/** What the platform sends to the error-reporting tool (NG-OBS-05): scrubbed, no personal data. */
export interface ErrorReport {
  readonly fingerprint: string;
  readonly name: string;
  readonly message: string;
}

/** Outgoing port to the error-reporting tool. Only its adapter knows the tool (NG-OBS-02, OBS-09). */
export interface ErrorReportingPort {
  send(report: ErrorReport): void;
}
