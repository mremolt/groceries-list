#!/usr/bin/env node
// generate:api (TS-TOOL-10): runs Orval against the backend's committed spec (REPO-API-01, API-CON-08).
// The spec file is created by the backend (`./mvnw verify -Dopenapi.update=true`). While it does not exist yet, the
// step is skipped ONLY when `ALLOW_MISSING_SPEC=1` is set explicitly, and says so; otherwise a missing spec fails
// (no silent fallback, no hand-written DTOs, API-CON-07).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const spec = new URL('../../backend/openapi/groceries-v1.yaml', import.meta.url);
if (!existsSync(spec)) {
  if (process.env['ALLOW_MISSING_SPEC'] === '1') {
    console.warn('generate:api skipped: backend/openapi/groceries-v1.yaml does not exist (ALLOW_MISSING_SPEC=1).');
    process.exit(0);
  }
  console.error('generate:api failed: backend/openapi/groceries-v1.yaml is missing. Create it in the backend first.');
  process.exit(1);
}
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = spawnSync(npx, ['orval', '--config', 'orval.config.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(run.status ?? 1);
