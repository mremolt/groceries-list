// Architecture rules (TS-ARCH-12, Angular constants of NG-ARCH). Checked by `npm run check:arch`; the fixture test in
// test/architecture.spec.ts proves the checker is not empty (TS-ARCH-13, ARCH-ENF-02).
const COMPOSITION_FILE = '\\.providers\\.ts$';
const ROOT_HTTP_SETUP = '^src/app/app\\.config\\.ts$';
const HTTP_CLIENT_MODULES = 'node_modules/(@angular/common/http|axios|ky)';
const TEST_FILE = '\\.spec\\.ts$|^src/testing/';

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment: 'TS-ARCH-01: domain imports only its own domain and the platform domain entry',
      from: { path: '^src/(features/[^/]+|platform)/domain/', pathNot: TEST_FILE },
      to: { pathNot: ['^src/$1/domain/', '^src/platform/domain/index\\.ts$'] },
    },
    {
      name: 'ports-only-domain',
      severity: 'error',
      from: { path: '^src/(features/[^/]+|platform)/ports/', pathNot: TEST_FILE },
      to: { pathNot: ['^src/$1/(domain|ports)/', '^src/platform/domain/index\\.ts$', 'node_modules/(zod|rxjs)/'] },
    },
    {
      name: 'application-only-core',
      severity: 'error',
      from: { path: '^src/(features/[^/]+|platform)/application/', pathNot: TEST_FILE },
      to: { pathNot: ['^src/$1/(domain|ports|application)/', '^src/platform/domain/index\\.ts$', 'node_modules/zod/'] },
    },
    {
      name: 'adapters-use-ports-not-services',
      severity: 'error',
      from: { path: '^src/(features/[^/]+|platform)/adapter/', pathNot: TEST_FILE },
      to: { path: '^src/$1/application/' },
    },
    {
      name: 'ui-and-http-adapters-independent',
      severity: 'error',
      from: { path: '/adapter/in/', pathNot: TEST_FILE },
      to: { path: '/adapter/out/' },
    },
    {
      name: 'ui-no-outgoing-ports',
      severity: 'error',
      comment: 'TS-ARCH-08: the UI reaches the core only through ports/in',
      from: { path: '/adapter/in/', pathNot: TEST_FILE },
      to: { path: '/ports/out/' },
    },
    {
      name: 'stores-only-call-use-cases',
      severity: 'error',
      comment: 'TS-ARCH-03',
      from: { path: '-store\\.ts$' },
      to: {
        path: ['/adapter/out/', '/application/', '/ports/out/', '/generated/', '-store\\.ts$', HTTP_CLIENT_MODULES],
      },
    },
    {
      name: 'features-only-via-index',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/[^/]+/', pathNot: ['^src/features/$1/', '^src/features/[^/]+/index\\.ts$'] },
    },
    {
      name: 'platform-only-via-index',
      severity: 'error',
      from: { path: '^src/(features|app|shared)/', pathNot: TEST_FILE },
      to: {
        path: '^src/platform/',
        pathNot: [
          '^src/platform/index\\.ts$',
          '^src/platform/domain/index\\.ts$',
          '^src/platform/adapter/out/http/[^/]+/generated/',
        ],
      },
    },
    {
      name: 'platform-no-features',
      severity: 'error',
      from: { path: '^src/platform/' },
      to: { path: '^src/features/' },
    },
    {
      name: 'feature-routes-only-from-app',
      severity: 'error',
      from: { pathNot: ['^src/app/', TEST_FILE] },
      to: { path: '^src/features/[^/]+/[^/]+\\.routes\\.ts$' },
    },
    {
      name: 'feature-routes-only-lazy',
      severity: 'error',
      from: { path: '^src/app/' },
      to: { path: '^src/features/[^/]+/[^/]+\\.routes\\.ts$', dependencyTypesNot: ['dynamic-import'] },
    },
    {
      name: 'generated-api-only-in-http-adapter',
      severity: 'error',
      from: { pathNot: '/adapter/out/http/' },
      to: { path: '/adapter/out/http/generated/' },
    },
    {
      name: 'http-clients-only-in-http-adapter',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: ['/adapter/out/http/', '^src/platform/adapter/', COMPOSITION_FILE, ROOT_HTTP_SETUP, TEST_FILE],
      },
      to: { path: HTTP_CLIENT_MODULES },
    },
    {
      name: 'tokens-only-ports',
      severity: 'error',
      from: { path: '^src/(features/[^/]+|platform)/[^/]+\\.tokens\\.ts$' },
      to: { path: '^src/', pathNot: ['^src/$1/ports/', '^src/platform/domain/index\\.ts$'] },
    },
    {
      name: 'composition-root-not-imported',
      severity: 'error',
      from: { pathNot: ['\\.routes\\.ts$', '^src/app/', '^src/features/[^/]+/index\\.ts$', TEST_FILE] },
      to: { path: COMPOSITION_FILE },
    },
    {
      name: 'runtime-config-token-not-in-core',
      severity: 'error',
      comment: 'NG-CFG-04: domain, application and ports never import the platform token file',
      from: { path: '/(domain|application|ports)/', pathNot: TEST_FILE },
      to: { path: 'platform\\.tokens\\.ts$' },
    },
    {
      name: 'shared-ui-no-features',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/features/' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
  },
};
