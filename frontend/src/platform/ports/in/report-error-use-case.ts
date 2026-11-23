/** Incoming port: report an unexpected error once (NG-OBS-02). */
export interface ReportErrorUseCase {
  report(error: unknown): void;
}
