import { describe, expect, it, vi } from 'vitest';

import type { ErrorReportingPort } from '../ports/out/error-reporting-port';
import { ReportErrorService } from './report-error-service';

function fakePort() {
  const send = vi.fn();
  const port: ErrorReportingPort = { send };
  return { port, send };
}

describe('ReportErrorService', () => {
  it('sends an unexpected error once and drops the duplicate', () => {
    const { port, send } = fakePort();
    const service = new ReportErrorService(port);

    service.report(new TypeError('secret value 4711'));
    service.report(new TypeError('secret value 4711'));

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never sends the original message, which may carry personal data', () => {
    const { port, send } = fakePort();
    new ReportErrorService(port).report(new Error('mail@example.org typed in a field'));

    expect(JSON.stringify(send.mock.calls)).not.toContain('mail@example.org');
  });

  it('reports values that are not errors', () => {
    const { port, send } = fakePort();
    new ReportErrorService(port).report('plain string');

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ name: 'NonError' }));
  });

  it('stops after the per-page-load cap', () => {
    const { port, send } = fakePort();
    const service = new ReportErrorService(port);
    for (let i = 0; i < 30; i++) {
      const error = new Error('x');
      error.name = `Error${String(i)}`;
      service.report(error);
    }

    expect(send).toHaveBeenCalledTimes(20);
  });
});
