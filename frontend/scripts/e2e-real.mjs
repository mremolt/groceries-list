#!/usr/bin/env node
// Real-backend E2E tier (REPO-CI-04, SPRING-DEV-10): runs the `@real` scenarios against the application image and the
// identity provider started from backend/. It never starts the stack itself; a missing stack is a clear failure.
//   cd backend && ./mvnw spring-boot:build-image -Dfrontend.dist=../frontend/dist/frontend/browser \
//        -Dspring-boot.build-image.imageName=groceries:local
//   docker compose --profile auth --profile mail -f compose.yaml -f compose.app.yaml up -d --wait
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const needed = [
  ['the application', 'http://localhost:8080/livez'],
  ['Keycloak', 'http://keycloak.localhost:8180/realms/groceries/.well-known/openid-configuration'],
  ['Mailpit', 'http://localhost:8025/api/v1/info'],
];
const missing = [];
for (const [name, url] of needed) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) missing.push(`${name} answered ${response.status} at ${url}`);
  } catch {
    missing.push(`${name} is not reachable at ${url}`);
  }
}
if (missing.length > 0) {
  console.error(`The real-backend stack is not up:\n  - ${missing.join('\n  - ')}`);
  console.error(
    'Start it: cd backend && docker compose --profile auth --profile mail -f compose.yaml -f compose.app.yaml up -d --wait',
  );
  process.exit(1);
}
rmSync('test-results/real-secrets.txt', { force: true });
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = spawnSync(npx, ['playwright', 'test', '--project=real', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, E2E_REAL: '1' },
  shell: process.platform === 'win32',
});

// After all flows the application log must hold no password, client secret or session id, and no e-mail address
// (NFR-SEC-09, DP-TEL-01, SPRING-DP-07 at runtime). The tests record every secret they used in test-results/real-secrets.txt.
const logs = spawnSync(
  'docker',
  [
    'compose',
    '--profile',
    'auth',
    '--profile',
    'mail',
    '-f',
    '../backend/compose.yaml',
    '-f',
    '../backend/compose.app.yaml',
    'logs',
    'app',
    '--no-color',
  ],
  { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
).stdout;
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/app.log', logs);
const secrets = new Set(['dev-only-client-secret']);
if (existsSync('test-results/real-secrets.txt')) {
  for (const line of readFileSync('test-results/real-secrets.txt', 'utf8').split('\n'))
    if (line.length >= 8) secrets.add(line);
}
const leaks = [...secrets].filter((secret) => logs.includes(secret)).map(() => 'a recorded secret');
if (/e2e-[a-z0-9-]+@example\.test/.test(logs)) leaks.push('an e-mail address');
if (/\/j\/[A-Za-z0-9_-]{20,}/.test(logs)) leaks.push('a share-link token');
if (logs.length < 1000) leaks.push('no application log was captured (check the Compose project)');
if (leaks.length > 0) {
  console.error(`Log check failed (test-results/app.log): ${leaks.join(', ')}`);
  process.exit(1);
}
console.log(
  `Log check passed: ${String(secrets.size)} recorded secrets and personal data are absent from the application log.`,
);
process.exit(run.status ?? 1);
