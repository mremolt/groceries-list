import { defineConfig, type OptionsExport } from 'orval';

// Spec: the backend's committed contract (REPO-API-01, API-CON-08). Generated code stays inside the outgoing HTTP
// adapter of the feature that uses it (TS-API-02, API-CON-09, ARCH-ADP-12): one block per feature, filtered by the
// spec's tag. Env `ORVAL_SPEC` overrides the spec path for a local experiment only; `generate:api` never sets it.
const target = process.env['ORVAL_SPEC'] ?? '../backend/openapi/groceries-v1.yaml';

function feature(name: string, tag: string): Record<string, OptionsExport> {
  const input = { target, filters: { tags: [tag] } };
  const generated = `./src/features/${name}/adapter/out/http/generated`;
  return {
    [name]: {
      input,
      output: {
        mode: 'tags-split',
        target: `${generated}/endpoints`,
        schemas: `${generated}/model`,
        client: 'angular', // TS-API-03: HttpClient services, interceptors apply
        override: { angular: { provideIn: false } }, // TS-API-04
        mock: { generators: [{ type: 'msw', useExamples: true }] }, // API-CON-11
        urlEncodeParameters: true, // TS-API-09
        clean: true,
      },
    },
    [`${name}Zod`]: {
      input,
      output: {
        mode: 'tags-split',
        target: `${generated}/endpoints`,
        client: 'zod',
        fileExtension: '.zod.ts',
      },
    },
  };
}

export default defineConfig({
  ...feature('session', 'me-controller'),
  ...feature('lists', 'lists'),
  ...feature('items', 'items'),
});
