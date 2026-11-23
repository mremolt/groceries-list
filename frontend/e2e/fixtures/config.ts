import type { RuntimeConfig } from '../../src/platform/ports/out/runtime-config';

/** The stubbed `/config.json` of the E2E tier (NG-CFG-06: the file is not part of the build). */
export const stubConfig: RuntimeConfig = {
  environment: 'e2e',
  apiBaseUrl: '/api',
  errorReporting: { enabled: false, path: '/api/v1/errors' },
};
